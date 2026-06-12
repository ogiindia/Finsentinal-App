import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Import icon libraries
import * as LucideIcons from 'lucide-react';
import * as FaIcons from 'react-icons/fa';
import * as Fa6Icons from 'react-icons/fa6';
import * as MdIcons from 'react-icons/md';
import * as AiIcons from 'react-icons/ai';

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  container: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    width: '100%',
    maxWidth: '520px',
  },
  
  selectButtonContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  selectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057',
    transition: 'all 0.2s ease',
  },
  selectButtonActive: {
    backgroundColor: '#e7f1ff',
    borderColor: '#4dabf7',
    color: '#1971c2',
  },
  hideButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#fff5f5',
    border: '1px solid #ffc9c9',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#e03131',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  
  panel: {
    marginTop: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
  
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#868e96',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  tabActive: {
    color: '#228be6',
    backgroundColor: '#ffffff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '2px',
    backgroundColor: '#228be6',
  },
  
  panelContent: {
    padding: '16px',
  },
  
  searchContainer: {
    marginBottom: '12px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#adb5bd',
    pointerEvents: 'none',
  },
  
  iconGridContainer: {
    height: '280px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    backgroundColor: '#fafbfc',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '4px',
    padding: '8px',
  },
  
  iconCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    aspectRatio: '1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0,
  },
  iconCellSelected: {
    backgroundColor: '#d0ebff',
    boxShadow: 'inset 0 0 0 2px #228be6',
  },
  
  tooltip: {
    position: 'fixed',
    backgroundColor: '#212529',
    color: '#ffffff',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    pointerEvents: 'none',
    zIndex: 9999,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '200px',
    color: '#868e96',
    gap: '8px',
  },
  emptyStateIcon: {
    fontSize: '32px',
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: '14px',
  },
  
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e9ecef',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
    transition: 'all 0.15s ease',
  },
  selectActionButton: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#228be6',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#ffffff',
    transition: 'all 0.15s ease',
  },
  
  selectedDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    marginTop: '12px',
  },
  selectedIconPreview: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '20px',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#212529',
  },
  selectedLibrary: {
    fontSize: '12px',
    color: '#868e96',
    marginTop: '2px',
  },
  editButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#e7f1ff',
    border: '1px solid #a5d8ff',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#1971c2',
    transition: 'all 0.15s ease',
  },
  
  colorCustomization: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  colorPreviewSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  largePreview: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    fontSize: '32px',
    border: '1px solid #dee2e6',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  colorButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  colorButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: '#495057',
    transition: 'all 0.15s ease',
  },
  colorButtonActive: {
    borderColor: '#228be6',
    backgroundColor: '#e7f1ff',
  },
  colorSwatch: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  colorPickerContainer: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  colorPickerLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#495057',
    marginBottom: '8px',
  },
  colorPickerInput: {
    width: '100%',
    height: '40px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '0',
  },
  colorPresets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  colorPreset: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  colorPresetSelected: {
    border: '2px solid #228be6',
    boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.2)',
  },
  
  uploadSection: {
    padding: '16px',
  },
  uploadDropzone: {
    border: '2px dashed #dee2e6',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafbfc',
  },
  uploadDropzoneHover: {
    borderColor: '#228be6',
    backgroundColor: '#e7f1ff',
  },
  uploadIcon: {
    fontSize: '32px',
    color: '#adb5bd',
    marginBottom: '12px',
  },
  uploadText: {
    fontSize: '14px',
    color: '#495057',
    marginBottom: '4px',
  },
  uploadSubtext: {
    fontSize: '12px',
    color: '#868e96',
  },
  uploadPreview: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  uploadPreviewImage: {
    width: '48px',
    height: '48px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  uploadFileName: {
    flex: 1,
    fontSize: '13px',
    color: '#495057',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  removeUploadButton: {
    padding: '6px 12px',
    border: '1px solid #ffc9c9',
    borderRadius: '6px',
    backgroundColor: '#fff5f5',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    color: '#e03131',
    transition: 'all 0.15s ease',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isValidReactComponent = (component) => {
  return typeof component === 'function' || 
         (typeof component === 'object' && component !== null && typeof component.render === 'function');
};

const extractLucideIcons = () => {
  const icons = [];
  const excludeNames = new Set(['createLucideIcon', 'default', 'icons']);
  
  try {
    for (const [name, component] of Object.entries(LucideIcons)) {
      if (
        !excludeNames.has(name) &&
        !name.startsWith('lucide') &&
        !name.startsWith('__') &&
        isValidReactComponent(component)
      ) {
        icons.push({ name, component, library: 'lucide' });
      }
    }
  } catch (e) {
    console.error('Error extracting Lucide icons:', e);
  }
  
  return icons;
};

const extractReactIcons = (iconLib, prefix, libraryName) => {
  const icons = [];
  
  if (!iconLib || typeof iconLib !== 'object') return icons;
  
  try {
    for (const [name, component] of Object.entries(iconLib)) {
      if (name.startsWith(prefix) && isValidReactComponent(component)) {
        icons.push({ name, component, library: libraryName });
      }
    }
  } catch (e) {
    console.error(`Error extracting ${libraryName} icons:`, e);
  }
  
  return icons;
};

// Build icons lazily
let ALL_ICONS_CACHE = null;

const getAllIcons = () => {
  if (ALL_ICONS_CACHE) return ALL_ICONS_CACHE;
  
  try {
    const lucideIcons = extractLucideIcons();
    const fa6Icons = extractReactIcons(Fa6Icons, 'Fa', 'fa6');
    const faIcons = extractReactIcons(FaIcons, 'Fa', 'fa');
    const mdIcons = extractReactIcons(MdIcons, 'Md', 'md');
    const aiIcons = extractReactIcons(AiIcons, 'Ai', 'ai');
    
    ALL_ICONS_CACHE = [
      ...lucideIcons,
      ...fa6Icons,
      ...faIcons,
      ...mdIcons,
      ...aiIcons,
    ].filter(icon => icon && icon.component && icon.name);
    
    console.log(`IconPicker: Loaded ${ALL_ICONS_CACHE.length} icons`);
    
    return ALL_ICONS_CACHE;
  } catch (error) {
    console.error('IconPicker: Error loading icons', error);
    return [];
  }
};

const LIBRARY_NAMES = {
  lucide: 'Lucide',
  fa6: 'Font Awesome 6',
  fa: 'Font Awesome 5',
  md: 'Material Design',
  ai: 'Ant Design',
};

const COLOR_PRESETS = [
  '#228be6', '#40c057', '#fab005', '#fa5252', '#be4bdb',
  '#15aabf', '#fd7e14', '#868e96', '#212529', '#ffffff',
  '#e7f1ff', '#d3f9d8', '#fff3bf', '#ffe3e3', '#f3d9fa',
];

// ============================================================================
// ICON PICKER COMPONENT
// ============================================================================
const IconPicker = ({ value, onChange, disabled = false }) => {
  // Load all icons once
  const allIcons = useMemo(() => getAllIcons(), []);

  // Panel visibility state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('selection');
  
  // Selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedIcon, setTempSelectedIcon] = useState(null);
  
  // Upload state
  const [tempUploadedFile, setTempUploadedFile] = useState(null);
  const [tempUploadPreview, setTempUploadPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Color customization state
  const [activeColorPicker, setActiveColorPicker] = useState(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  
  // Refs
  const gridContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Filter icons by search query - limit display for performance
  const filteredIcons = useMemo(() => {
    if (!allIcons || allIcons.length === 0) return [];
    
    let result = allIcons;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = allIcons.filter(icon => 
        icon && icon.name && icon.name.toLowerCase().includes(query)
      );
    }
    
    // Limit to first 500 icons for performance when not searching
    // Users should search to find specific icons
    return result.slice(0, 500);
  }, [allIcons, searchQuery]);

  // Toggle panel
  const handleTogglePanel = useCallback(() => {
    if (isPanelOpen) {
      setTempSelectedIcon(null);
      setActiveColorPicker(null);
    } else {
      if (value?.iconType === 'library' && value?.iconName) {
        setTempSelectedIcon({
          name: value.iconName,
          library: value.iconLibrary,
          bgColor: value.iconBgColor || '#ffffff',
          fillColor: value.iconFillColor || '#212529',
        });
        setActiveTab('selection');
      } else if (value?.iconType === 'upload' && value?.uploadedIconFile) {
        setTempUploadedFile(value.uploadedIconFile);
        setTempUploadPreview(URL.createObjectURL(value.uploadedIconFile));
        setActiveTab('upload');
      }
    }
    setIsPanelOpen(!isPanelOpen);
  }, [isPanelOpen, value]);
  
  // Handle icon click
  const handleIconClick = useCallback((icon) => {
    if (!icon) return;
    
    if (tempSelectedIcon?.name === icon.name && tempSelectedIcon?.library === icon.library) {
      setTempSelectedIcon(null);
    } else {
      setTempSelectedIcon({
        name: icon.name,
        library: icon.library,
        bgColor: tempSelectedIcon?.bgColor || value?.iconBgColor || '#ffffff',
        fillColor: tempSelectedIcon?.fillColor || value?.iconFillColor || '#212529',
      });
    }
  }, [tempSelectedIcon, value]);
  
  // Handle cancel
  const handleCancel = useCallback(() => {
    setTempSelectedIcon(null);
    setTempUploadedFile(null);
    setTempUploadPreview(null);
    setActiveColorPicker(null);
    setSearchQuery('');
    setIsPanelOpen(false);
  }, []);
  
  // Handle select
  const handleSelect = useCallback(() => {
    if (activeTab === 'selection' && tempSelectedIcon) {
      onChange({
        iconName: tempSelectedIcon.name,
        iconLibrary: tempSelectedIcon.library,
        iconBgColor: tempSelectedIcon.bgColor,
        iconFillColor: tempSelectedIcon.fillColor,
        iconType: 'library',
        uploadedIconFile: null,
      });
    } else if (activeTab === 'upload' && tempUploadedFile) {
      onChange({
        iconName: tempUploadedFile.name,
        iconLibrary: null,
        iconBgColor: value?.iconBgColor || '#ffffff',
        iconFillColor: value?.iconFillColor || '#212529',
        iconType: 'upload',
        uploadedIconFile: tempUploadedFile,
      });
    }
    setTempSelectedIcon(null);
    setTempUploadedFile(null);
    setTempUploadPreview(null);
    setActiveColorPicker(null);
    setSearchQuery('');
    setIsPanelOpen(false);
  }, [activeTab, tempSelectedIcon, tempUploadedFile, value, onChange]);
  
  // Handle color change
  const handleColorChange = useCallback((type, color) => {
    if (activeTab === 'selection' && tempSelectedIcon) {
      setTempSelectedIcon({
        ...tempSelectedIcon,
        [type === 'bg' ? 'bgColor' : 'fillColor']: color,
      });
    } else if (value) {
      onChange({
        ...value,
        [type === 'bg' ? 'iconBgColor' : 'iconFillColor']: color,
      });
    }
  }, [activeTab, tempSelectedIcon, value, onChange]);
  
  // Handle file upload
  const handleFileUpload = useCallback((file) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (PNG, JPEG, GIF, SVG)');
      return;
    }
    
    setTempUploadedFile(file);
    setTempUploadPreview(URL.createObjectURL(file));
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Handle search change
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollTop = 0;
    }
  }, []);
  
  // Handle edit button
  const handleEdit = useCallback(() => {
    if (value?.iconType === 'library') {
      setTempSelectedIcon({
        name: value.iconName,
        library: value.iconLibrary,
        bgColor: value.iconBgColor || '#ffffff',
        fillColor: value.iconFillColor || '#212529',
      });
      setActiveTab('selection');
    } else if (value?.iconType === 'upload') {
      setTempUploadedFile(value.uploadedIconFile);
      if (value.uploadedIconFile) {
        setTempUploadPreview(URL.createObjectURL(value.uploadedIconFile));
      }
      setActiveTab('upload');
    }
    setIsPanelOpen(true);
  }, [value]);
  
  // Tooltip handlers
  const showTooltip = useCallback((text, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, []);
  
  const hideTooltip = useCallback(() => {
    setTooltip({ visible: false, text: '', x: 0, y: 0 });
  }, []);

  // Get icon component by name and library
  const getIconComponent = useCallback((iconName, library) => {
    if (!iconName || !library) return null;
    const icon = allIcons.find(i => i.name === iconName && i.library === library);
    return icon?.component || null;
  }, [allIcons]);

  const hasSelection = value?.iconType && (value.iconName || value.uploadedIconFile);
  const canSelect = (activeTab === 'selection' && tempSelectedIcon) || 
                    (activeTab === 'upload' && tempUploadedFile);

  return (
    <div style={styles.container}>
      {/* Select Button */}
      <div style={styles.selectButtonContainer}>
        <button
          type="button"
          style={{
            ...styles.selectButton,
            ...(isPanelOpen ? styles.selectButtonActive : {}),
          }}
          onClick={handleTogglePanel}
          disabled={disabled}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Select Icon
        </button>
        
        {isPanelOpen && (
          <button
            type="button"
            style={styles.hideButton}
            onClick={handleTogglePanel}
            title="Close panel"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Panel */}
      {isPanelOpen && (
        <div style={styles.panel}>
          {/* Tabs */}
          <div style={styles.tabContainer}>
            <button
              type="button"
              style={{
                ...styles.tab,
                ...(activeTab === 'selection' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('selection')}
            >
              Icon Selection
              {activeTab === 'selection' && <div style={styles.tabIndicator} />}
            </button>
            <button
              type="button"
              style={{
                ...styles.tab,
                ...(activeTab === 'upload' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('upload')}
            >
              Icon Upload
              {activeTab === 'upload' && <div style={styles.tabIndicator} />}
            </button>
          </div>
          
          {/* Icon Selection Panel */}
          {activeTab === 'selection' && (
            <div style={styles.panelContent}>
              {/* Search */}
              <div style={styles.searchContainer}>
                <div style={styles.searchIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={styles.searchInput}
                />
              </div>
              
              {/* Icon Grid */}
              <div style={styles.iconGridContainer} ref={gridContainerRef}>
                {filteredIcons.length > 0 ? (
                  <div style={styles.iconGrid}>
                    {filteredIcons.map((icon, index) => {
                      const IconComponent = icon.component;
                      const isSelected = tempSelectedIcon?.name === icon.name && 
                                         tempSelectedIcon?.library === icon.library;
                      
                      return (
                        <button
                          key={`${icon.library}-${icon.name}-${index}`}
                          type="button"
                          style={{
                            ...styles.iconCell,
                            ...(isSelected ? styles.iconCellSelected : {}),
                          }}
                          onClick={() => handleIconClick(icon)}
                          onMouseEnter={(e) => showTooltip(icon.name, e)}
                          onMouseLeave={hideTooltip}
                        >
                          <IconComponent size={22} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyStateIcon}>🔍</div>
                    <div style={styles.emptyStateText}>
                      {searchQuery ? `No icons found for "${searchQuery}"` : 'Loading icons...'}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Note about search */}
              {!searchQuery && filteredIcons.length >= 500 && (
                <div style={{ fontSize: '12px', color: '#868e96', marginTop: '8px', textAlign: 'center' }}>
                  Showing first 500 icons. Use search to find more.
                </div>
              )}
              
              {/* Color Customization */}
              {tempSelectedIcon && (
                <div style={styles.colorCustomization}>
                  <div style={styles.colorPreviewSection}>
                    <div
                      style={{
                        ...styles.largePreview,
                        backgroundColor: tempSelectedIcon.bgColor,
                        color: tempSelectedIcon.fillColor,
                      }}
                    >
                      {(() => {
                        const IconComp = getIconComponent(tempSelectedIcon.name, tempSelectedIcon.library);
                        return IconComp ? <IconComp size={32} /> : null;
                      })()}
                    </div>
                    <div style={styles.colorButtons}>
                      <button
                        type="button"
                        style={{
                          ...styles.colorButton,
                          ...(activeColorPicker === 'bg' ? styles.colorButtonActive : {}),
                        }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'bg' ? null : 'bg')}
                      >
                        <div style={{ ...styles.colorSwatch, backgroundColor: tempSelectedIcon.bgColor }} />
                        Background Color
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.colorButton,
                          ...(activeColorPicker === 'fill' ? styles.colorButtonActive : {}),
                        }}
                        onClick={() => setActiveColorPicker(activeColorPicker === 'fill' ? null : 'fill')}
                      >
                        <div style={{ ...styles.colorSwatch, backgroundColor: tempSelectedIcon.fillColor }} />
                        Fill Color
                      </button>
                    </div>
                  </div>
                  
                  {activeColorPicker && (
                    <div style={styles.colorPickerContainer}>
                      <div style={styles.colorPickerLabel}>
                        {activeColorPicker === 'bg' ? 'Background Color' : 'Fill Color'}
                      </div>
                      <input
                        type="color"
                        value={activeColorPicker === 'bg' ? tempSelectedIcon.bgColor : tempSelectedIcon.fillColor}
                        onChange={(e) => handleColorChange(activeColorPicker, e.target.value)}
                        style={styles.colorPickerInput}
                      />
                      <div style={styles.colorPresets}>
                        {COLOR_PRESETS.map((color) => (
                          <div
                            key={color}
                            style={{
                              ...styles.colorPreset,
                              backgroundColor: color,
                              ...((activeColorPicker === 'bg' ? tempSelectedIcon.bgColor : tempSelectedIcon.fillColor) === color 
                                ? styles.colorPresetSelected 
                                : {}),
                            }}
                            onClick={() => handleColorChange(activeColorPicker, color)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Icon Upload Panel */}
          {activeTab === 'upload' && (
            <div style={styles.uploadSection}>
              <div
                style={{
                  ...styles.uploadDropzone,
                  ...(isDragging ? styles.uploadDropzoneHover : {}),
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={styles.uploadIcon}>📁</div>
                <div style={styles.uploadText}>
                  Drop your icon here or click to browse
                </div>
                <div style={styles.uploadSubtext}>
                  Supports PNG, JPEG, GIF, SVG
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                style={{ display: 'none' }}
              />
              
              {tempUploadPreview && (
                <div style={styles.uploadPreview}>
                  <img
                    src={tempUploadPreview}
                    alt="Uploaded icon"
                    style={styles.uploadPreviewImage}
                  />
                  <div style={styles.uploadFileName}>
                    {tempUploadedFile?.name}
                  </div>
                  <button
                    type="button"
                    style={styles.removeUploadButton}
                    onClick={() => {
                      setTempUploadedFile(null);
                      setTempUploadPreview(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={styles.actionButtons}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={handleCancel}
              >
                Cancel
              </button>
              {canSelect && (
                <button
                  type="button"
                  style={styles.selectActionButton}
                  onClick={handleSelect}
                >
                  Select
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Selected Display */}
      {!isPanelOpen && hasSelection && (
        <div style={styles.selectedDisplay}>
          <div
            style={{
              ...styles.selectedIconPreview,
              backgroundColor: value.iconBgColor || '#ffffff',
              color: value.iconFillColor || '#212529',
              border: '1px solid #dee2e6',
            }}
          >
            {value.iconType === 'library' ? (
              (() => {
                const IconComp = getIconComponent(value.iconName, value.iconLibrary);
                return IconComp ? <IconComp size={20} /> : null;
              })()
            ) : value.uploadedIconFile ? (
              <img
                src={URL.createObjectURL(value.uploadedIconFile)}
                alt="Uploaded icon"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
            ) : null}
          </div>
          <div style={styles.selectedInfo}>
            <div style={styles.selectedName}>{value.iconName}</div>
            {value.iconLibrary && (
              <div style={styles.selectedLibrary}>
                {LIBRARY_NAMES[value.iconLibrary] || value.iconLibrary}
              </div>
            )}
          </div>
          <button
            type="button"
            style={styles.editButton}
            onClick={handleEdit}
            title="Edit icon"
          >
            ✏️
          </button>
        </div>
      )}
      
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            ...styles.tooltip,
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default IconPicker;
