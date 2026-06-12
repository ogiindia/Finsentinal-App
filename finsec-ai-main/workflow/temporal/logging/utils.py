import re
from typing import Optional

def parse_log_level_from_message(message: str, stream: Optional[str] = None) -> str:
    """
    Parse log level from message content based on keywords and patterns.
    
    Args:
        message: The log message content
        stream: The stream type (stdout/stderr) - optional
        
    Returns:
        str: The detected log level (error, warning, info, debug, success)
    """
    if not message:
        return 'info'
    
    message_upper = message.upper().strip()
    
    # Primary log level patterns (with word boundaries)
    log_level_patterns = [
        (r'\b(ERROR|ERRO)\b', 'error'),
        (r'\b(WARN|WARNING)\b', 'warning'),
        (r'\b(INFO|INFORMATION)\b', 'info'),
        (r'\b(DEBUG|DBG)\b', 'debug'),
        (r'\b(SUCCESS|SUCCESSFUL|COMPLETED)\b', 'success'),
        (r'\b(FAIL|FAILED|FAILURE)\b', 'error'),
    ]
    
    # Check primary patterns first
    for pattern, level in log_level_patterns:
        if re.search(pattern, message_upper):
            return level
    
    # Error indicators
    error_indicators = [
        'EXCEPTION', 'TRACEBACK', 'FATAL', 'CRITICAL', 
        'FAILED TO', 'ERROR:', 'CANNOT', 'UNABLE TO'
    ]
    
    for indicator in error_indicators:
        if indicator in message_upper:
            return 'error'
    
    # Warning indicators
    warning_indicators = [
        'DEPRECATED', 'FALLING BACK', 'NOT SUPPORTED', 
        'REQUESTED', 'WARN:', 'WARNING:'
    ]
    
    for indicator in warning_indicators:
        if indicator in message_upper:
            return 'warning'
    
    # Success indicators
    success_indicators = [
        'COMPLETED SUCCESSFULLY', 'SUCCESS:', 'FINISHED', 
        'DONE', 'READY', 'STARTED SUCCESSFULLY'
    ]
    
    for indicator in success_indicators:
        if indicator in message_upper:
            return 'success'
    
    # Specific message patterns
    info_patterns = [
        'Setting default log level',
        'To adjust logging level',
        '[Stage',
        'Beginning worker shutdown',
        'Closing down clientserver'
    ]
    
    for pattern in info_patterns:
        if pattern in message:
            return 'info'
    
    # Default to info if no specific pattern is found
    return 'info'

def format_log_message(message: str, max_length: int = 1000) -> str:
    """
    Format log message by truncating if too long and cleaning up whitespace.
    
    Args:
        message: The message to format
        max_length: Maximum length of the message
        
    Returns:
        str: Formatted message
    """
    if not message:
        return ""
    
    # Clean up whitespace
    formatted = ' '.join(message.split())
    
    # Truncate if too long
    if len(formatted) > max_length:
        formatted = formatted[:max_length-3] + "..."
    
    return formatted

def extract_component_from_message(message: str) -> str:
    """
    Extract component name from log message if present.
    
    Args:
        message: The log message
        
    Returns:
        str: Component name or 'unknown'
    """
    # Look for patterns like [ComponentName] or (ComponentName)
    patterns = [
        r'\[([^\]]+)\]',
        r'\(([^)]+)\)',
        r'^\w+:'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, message)
        if match:
            return match.group(1).strip()
    
    return 'unknown'