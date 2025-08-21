// Chatbot functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create chatbot elements
    const chatbotContainer = document.createElement('div');
    chatbotContainer.className = 'chatbot-container';

    const chatbotBubble = document.createElement('div');
    chatbotBubble.className = 'chatbot-bubble';
    
    // Create chat icon using ionicon
    const chatIcon = document.createElement('ion-icon');
    chatIcon.setAttribute('name', 'chatbubbles-outline');
    chatbotBubble.appendChild(chatIcon);

    const chatbotPanel = document.createElement('div');
    chatbotPanel.className = 'chatbot-panel';
    
    // Create header with controls
    const chatbotHeader = document.createElement('div');
    chatbotHeader.className = 'chatbot-header';
    
    // Add title
    const chatbotTitle = document.createElement('div');
    chatbotTitle.className = 'chatbot-title';
    chatbotTitle.textContent = 'Chat with Bipan';
    chatbotHeader.appendChild(chatbotTitle);
    
    // Add controls container
    const chatbotControls = document.createElement('div');
    chatbotControls.className = 'chatbot-controls';
    
    // Add minimize button
    const minimizeButton = document.createElement('button');
    minimizeButton.className = 'chatbot-minimize';
    minimizeButton.setAttribute('aria-label', 'Minimize chat');
    minimizeButton.setAttribute('title', 'Minimize');
    
    const minimizeIcon = document.createElement('ion-icon');
    minimizeIcon.setAttribute('name', 'remove-outline');
    minimizeButton.appendChild(minimizeIcon);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'chatbot-close';
    closeButton.setAttribute('aria-label', 'Close chat');
    closeButton.setAttribute('title', 'Close');
    
    const closeIcon = document.createElement('ion-icon');
    closeIcon.setAttribute('name', 'close-outline');
    closeButton.appendChild(closeIcon);
    
    // Add buttons to controls
    chatbotControls.appendChild(minimizeButton);
    chatbotControls.appendChild(closeButton);
    
    // Add controls to header
    chatbotHeader.appendChild(chatbotControls);
    
    // Add header to panel
    chatbotPanel.appendChild(chatbotHeader);
    
    // Create iframe container
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'chatbot-iframe-container';
    
    // Add iframe to container
    const chatbotIframe = document.createElement('iframe');
    chatbotIframe.src = "https://www.chatbase.co/chatbot-iframe/0_NtkhnnKghzPuAk0YQCY";
    chatbotIframe.frameBorder = "0";
    iframeContainer.appendChild(chatbotIframe);
    
    // Add iframe container to panel
    chatbotPanel.appendChild(iframeContainer);

    // Add elements to container
    chatbotContainer.appendChild(chatbotBubble);
    chatbotContainer.appendChild(chatbotPanel);

    // Add container to body
    document.body.appendChild(chatbotContainer);

    // Minimize state tracking
    let isMinimized = false;

    // Toggle chatbot panel when bubble is clicked
    chatbotBubble.addEventListener('click', function() {
        if (chatbotPanel.classList.contains('active')) {
            chatbotPanel.classList.remove('active');
            // Reset minimize state when closing
            if (isMinimized) {
                chatbotPanel.classList.remove('minimized');
                minimizeIcon.setAttribute('name', 'remove-outline');
                isMinimized = false;
            }
        } else {
            chatbotPanel.classList.add('active');
        }
    });

    // Minimize functionality
    minimizeButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event bubbling
        
        if (isMinimized) {
            // Restore the panel
            chatbotPanel.classList.remove('minimized');
            minimizeIcon.setAttribute('name', 'remove-outline');
        } else {
            // Minimize the panel
            chatbotPanel.classList.add('minimized');
            minimizeIcon.setAttribute('name', 'expand-outline');
        }
        
        isMinimized = !isMinimized;
    });

    // Close functionality
    closeButton.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event bubbling
        chatbotPanel.classList.remove('active');
        
        // Reset minimize state when closing
        if (isMinimized) {
            chatbotPanel.classList.remove('minimized');
            minimizeIcon.setAttribute('name', 'remove-outline');
            isMinimized = false;
        }
    });

    // Close chatbot panel when clicking outside
    document.addEventListener('click', function(event) {
        if (!chatbotContainer.contains(event.target) && chatbotPanel.classList.contains('active')) {
            chatbotPanel.classList.remove('active');
            
            // Reset minimize state when closing
            if (isMinimized) {
                chatbotPanel.classList.remove('minimized');
                minimizeIcon.setAttribute('name', 'remove-outline');
                isMinimized = false;
            }
        }
    });
    
    // Handle window resize for responsiveness
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 480) {
            // Mobile adjustments if needed
        } else {
            // Desktop adjustments if needed
        }
    });
});
