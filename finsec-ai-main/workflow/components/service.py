import json
import logging
import os
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app import Component, Section
from .config import MAX_ICON_SIZE, DEFAULT_ICON_CLASS
from .models import ComponentRequest, ComponentResponse, SectionResponse, ComponentError
from .utils import (
    save_uploaded_file, delete_file_if_exists, convert_icon_to_base64,
    validate_icon_file, validate_file_size, validate_python_file_path
)

logger = logging.getLogger('components_service')

class ComponentService:
    """Service class for component business logic with file path support"""
    
    def __init__(self):
        pass
    
    async def create_component(
        self,
        name: str,
        section: str,
        parameters: str,
        python_file_path: Optional[str],  # NEW: File path instead of upload
        description: Optional[str],
        icon: Optional[UploadFile],
        db: Session
    ) -> ComponentResponse:
        """Create a new component using file path"""
        try:
            # Validate and parse parameters
            try:
                params = json.loads(parameters)
            except json.JSONDecodeError as e:
                raise ComponentError(f"Invalid parameters JSON: {str(e)}")
            
            # Validate Python file path
            if not python_file_path:
                raise ComponentError("Python file path is required")
            
            # Validate the file path
            validate_python_file_path(python_file_path)
            
            # Validate icon if provided
            icon_data = None
            if icon:
                icon_content = await icon.read()
                validate_file_size(icon_content, MAX_ICON_SIZE, "Icon")
                validate_icon_file(icon.filename, icon_content)
                icon_data = icon_content
            
            # Get or create section
            db_section = self._get_or_create_section(section, db)
            
            # Create component in database
            new_component = Component(
                name=name,
                section_id=db_section.id,
                parameters=params,
                description=description,
                file_path=python_file_path,  # Store the file path directly
                icon_path=icon_data,
                icon_class=DEFAULT_ICON_CLASS
            )
            
            db.add(new_component)
            db.commit()
            db.refresh(new_component)
            
            logger.info(f"Created component {new_component.id}: {new_component.name} with file path: {python_file_path}")
            
            return self._build_component_response(new_component, db_section.name, db)
            
        except ComponentError:
            raise
        except Exception as e:
            logger.error(f"Error creating component: {str(e)}")
            raise ComponentError(f"Failed to create component: {str(e)}")
    
    def get_component(self, component_id: int, db: Session) -> ComponentResponse:
        """Get a component by ID"""
        component = db.query(Component).filter(Component.id == component_id).first()
        
        if not component:
            raise ComponentError(f"Component with ID {component_id} not found")
        
        section = db.query(Section).filter(Section.id == component.section_id).first()
        section_name = section.name if section else None
        
        return self._build_component_response(component, section_name, db)
    
    def get_components(self, section_id: Optional[int], db: Session) -> List[ComponentResponse]:
        """Get all components or filter by section"""
        query = db.query(Component)
        
        if section_id is not None:
            query = query.filter(Component.section_id == section_id)
        
        components = query.all()
        
        result = []
        for component in components:
            try:
                section = db.query(Section).filter(Section.id == component.section_id).first()
                section_name = section.name if section else None
                result.append(self._build_component_response(component, section_name, db))
            except Exception as e:
                logger.error(f"Error processing component {component.id}: {str(e)}")
                # Add minimal component info on error
                result.append(self._build_error_component_response(component.id))
        
        return result
    
    async def update_component(
        self,
        component_id: int,
        name: str,
        section: str,
        parameters: str,
        python_file_path: Optional[str],  # NEW: File path instead of upload
        description: Optional[str],
        icon: Optional[UploadFile],
        db: Session
    ) -> ComponentResponse:
        """Update an existing component using file path"""
        component = db.query(Component).filter(Component.id == component_id).first()
        
        if not component:
            raise ComponentError(f"Component with ID {component_id} not found")
        
        try:
            # Validate and parse parameters
            try:
                params = json.loads(parameters)
            except json.JSONDecodeError as e:
                raise ComponentError(f"Invalid parameters JSON: {str(e)}")
            
            # Get or create section
            db_section = self._get_or_create_section(section, db)
            
            # Update Python file path if provided
            if python_file_path:
                validate_python_file_path(python_file_path)
                component.file_path = python_file_path
                logger.info(f"Updated component {component_id} file path to: {python_file_path}")
            
            # Update icon if provided
            if icon:
                icon_content = await icon.read()
                validate_file_size(icon_content, MAX_ICON_SIZE, "Icon")
                validate_icon_file(icon.filename, icon_content)
                component.icon_path = icon_content
            
            # Update component
            component.name = name
            component.section_id = db_section.id
            component.parameters = params
            component.description = description
            
            db.commit()
            db.refresh(component)
            
            logger.info(f"Updated component {component.id}: {component.name}")
            
            return self._build_component_response(component, db_section.name, db)
            
        except ComponentError:
            raise
        except Exception as e:
            logger.error(f"Error updating component: {str(e)}")
            raise ComponentError(f"Failed to update component: {str(e)}")
    
    def delete_component(self, component_id: int, db: Session):
        """Delete a component (no file cleanup needed for paths)"""
        component = db.query(Component).filter(Component.id == component_id).first()
        
        if not component:
            raise ComponentError(f"Component with ID {component_id} not found")
        
        component_name = component.name
        file_path = component.file_path
        
        # Delete from database
        db.delete(component)
        db.commit()
        
        logger.info(f"Deleted component {component_id}: {component_name} (file path: {file_path})")
    
    def get_sections(self, db: Session) -> List[SectionResponse]:
        """Get all sections with their components"""
        sections = db.query(Section).all()
        
        result = []
        for section in sections:
            try:
                components = db.query(Component).filter(Component.section_id == section.id).all()
                
                component_list = []
                for component in components:
                    try:
                        icon_base64 = None
                        has_icon = False
                        
                        if hasattr(component, 'icon_path') and component.icon_path:
                            icon_base64 = convert_icon_to_base64(component.icon_path)
                            has_icon = icon_base64 is not None
                        
                        component_list.append({
                            "id": component.id,
                            "name": getattr(component, 'name', f'Component {component.id}'),
                            "icon_class": getattr(component, 'icon_class', DEFAULT_ICON_CLASS),
                            "icon_base64": icon_base64,
                            "has_icon": has_icon,
                            "description": getattr(component, 'description', ''),
                            "file_path": getattr(component, 'file_path', ''),
                            "parameters": getattr(component, 'parameters', {})
                        })
                    except Exception as e:
                        logger.error(f"Error processing component {component.id}: {str(e)}")
                        component_list.append(self._build_error_component_dict(component.id))
                
                result.append(SectionResponse(
                    id=section.id,
                    name=section.name,
                    components=component_list,
                    created_at=section.created_at
                ))
                
            except Exception as e:
                logger.error(f"Error processing section {section.id}: {str(e)}")
                result.append(SectionResponse(
                    id=section.id,
                    name=getattr(section, 'name', f'Section {section.id}'),
                    components=[],
                    created_at=getattr(section, 'created_at', None)
                ))
        
        return result
    
    def get_component_icon(self, component_id: int, db: Session) -> bytes:
        """Get component icon as binary data"""
        component = db.query(Component).filter(Component.id == component_id).first()
        
        if not component:
            raise ComponentError(f"Component with ID {component_id} not found")
        
        if not hasattr(component, 'icon_path') or not component.icon_path:
            raise ComponentError("Component has no icon")
        
        return component.icon_path
    
    def _get_or_create_section(self, section_name: str, db: Session) -> Section:
        """Get existing section or create new one"""
        db_section = db.query(Section).filter(Section.name == section_name).first()
        if not db_section:
            logger.info(f"Creating new section: {section_name}")
            db_section = Section(name=section_name)
            db.add(db_section)
            db.flush()
        return db_section
    
    def _build_component_response(self, component: Component, section_name: str, db: Session) -> ComponentResponse:
        """Build component response object"""
        # Check if Python file exists at the specified path
        python_file_exists = os.path.exists(component.file_path) if component.file_path else False
        
        # Convert icon to base64
        icon_base64 = None
        has_icon = False
        if hasattr(component, 'icon_path') and component.icon_path:
            icon_base64 = convert_icon_to_base64(component.icon_path)
            has_icon = icon_base64 is not None
        
        return ComponentResponse(
            id=component.id,
            name=component.name,
            section_id=component.section_id,
            section_name=section_name,
            parameters=component.parameters,
            description=component.description,
            icon_class=component.icon_class,
            file_path=component.file_path,
            python_file_exists=python_file_exists,
            icon_base64=icon_base64,
            has_icon=has_icon,
            created_at=component.created_at,
            updated_at=component.updated_at
        )
    
    def _build_error_component_response(self, component_id: int) -> ComponentResponse:
        """Build error component response"""
        from datetime import datetime
        return ComponentResponse(
            id=component_id,
            name=f'Component {component_id}',
            section_id=None,
            section_name=None,
            parameters={},
            description='Error loading component',
            icon_class=DEFAULT_ICON_CLASS,
            file_path=None,
            python_file_exists=False,
            icon_base64=None,
            has_icon=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def _build_error_component_dict(self, component_id: int) -> dict:
        """Build error component dictionary for sections"""
        return {
            "id": component_id,
            "name": f'Component {component_id}',
            "icon_class": DEFAULT_ICON_CLASS,
            "icon_base64": None,
            "has_icon": False,
            "description": 'Error loading component',
            "file_path": '',
            "parameters": {}
        }

# Global instance
component_service = ComponentService()