// Interprocess Communication Simulator

const themeSwitch = document.getElementById('theme-switch');
const processNameInput = document.getElementById('process-name');
const processColorInput = document.getElementById('process-color');
const processPriorityInput = document.getElementById('process-priority');
const createProcessBtn = document.getElementById('create-process');
const processListContainer = document.getElementById('process-list-container');
const commTypeSelect = document.getElementById('comm-type');
const sourceProcessSelect = document.getElementById('source-process');
const targetProcessSelect = document.getElementById('target-process');
const createChannelBtn = document.getElementById('create-channel');
const channelListContainer = document.getElementById('channel-list-container');
const messageChannelSelect = document.getElementById('message-channel');
const messageContentInput = document.getElementById('message-content');
const messageSizeInput = document.getElementById('message-size');
const messagePriorityInput = document.getElementById('message-priority');
const sendMessageBtn = document.getElementById('send-message');
const resetSimulationBtn = document.getElementById('reset-simulation');
const simulationSpeedInput = document.getElementById('simulation-speed');
const toggleLogBtn = document.getElementById('toggle-log');
const logEntriesContainer = document.getElementById('log-entries');
const messageLog = document.getElementById('message-log');
const visualizationSvg = document.getElementById('visualization-svg');
const processDetailsModal = document.getElementById('process-details-modal');
const processDetailsContent = document.getElementById('process-details-content');
const closeModal = document.querySelector('.close-modal');

let processes = [];
let channels = [];
let messages = [];
let simulationSpeed = 5;
let nextProcessId = 1;
let nextChannelId = 1;
let nextMessageId = 1;
let isDarkTheme = false;

// Process Class
class Process {
    constructor(id, name, color, priority) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.priority = priority;
        this.x = 0;
        this.y = 0;
        this.radius = 30;
        this.messageQueue = [];
        this.sharedMemory = {};
        this.createdAt = new Date();
        this.status = 'idle'; // idle, busy, blocked
        this.cpuUsage = 0;
        this.memoryUsage = 0;
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
    }

    receiveMessage(message) {
        this.messageQueue.push(message);
        this.status = 'busy';
        
        // Simulate processing time based on message size and process priority
        const processingTime = (message.size / 10) * (10 / this.priority) * (10 / simulationSpeed);
        
        setTimeout(() => {
            this.status = 'idle';
            this.cpuUsage = Math.random() * 50 + 10; // Random CPU usage between 10-60%
            this.memoryUsage = Math.random() * 100 + 50; // Random memory usage between 50-150MB
            updateVisualization();
        }, processingTime);
    }

    getDetails() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            priority: this.priority,
            status: this.status,
            cpuUsage: this.cpuUsage.toFixed(1),
            memoryUsage: this.memoryUsage.toFixed(1),
            messageQueueLength: this.messageQueue.length,
            createdAt: this.createdAt.toLocaleString()
        };
    }
}

// Channel Class
class Channel {
    constructor(id, type, sourceId, targetId) {
        this.id = id;
        this.type = type;
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.active = true;
        this.bandwidth = Math.floor(Math.random() * 100) + 50; // Random bandwidth between 50-150 MB/s
        this.latency = Math.floor(Math.random() * 100) + 10; // Random latency between 10-110ms
    }

    getSourceProcess() {
        return processes.find(p => p.id === this.sourceId);
    }

    getTargetProcess() {
        return processes.find(p => p.id === this.targetId);
    }

    getDetails() {
        return {
            id: this.id,
            type: this.type,
            source: this.getSourceProcess().name,
            target: this.getTargetProcess().name,
            bandwidth: this.bandwidth,
            latency: this.latency
        };
    }
}

// Message Class
class Message {
    constructor(id, channelId, content, size, priority) {
        this.id = id;
        this.channelId = channelId;
        this.content = content;
        this.size = size;
        this.priority = priority;
        this.status = 'pending'; // pending, sending, delivered, failed
        this.createdAt = new Date();
        this.deliveredAt = null;
    }

    getChannel() {
        return channels.find(c => c.id === this.channelId);
    }
}
document.querySelectorAll('.collapsible h2').forEach((header) => {
    header.addEventListener('click', () => {
        header.parentNode.classList.toggle('active');
    });
});

// Theme Toggle
themeSwitch.addEventListener('change', () => {
    isDarkTheme = themeSwitch.checked;
    document.body.classList.toggle('dark-theme', isDarkTheme);
});

// Process Management
createProcessBtn.addEventListener('click', createProcess);

function createProcess() {
    const name = processNameInput.value.trim() || `Process ${nextProcessId}`;
    const color = processColorInput.value;
    const priority = parseInt(processPriorityInput.value);

    if (priority < 1 || priority > 10) {
        alert('Priority must be between 1 and 10');
        return;
    }

    const process = new Process(nextProcessId++, name, color, priority);
    processes.push(process);

    // Update UI
    updateProcessList();
    updateProcessSelects();
    updateVisualization();
    
    // Reset form
    processNameInput.value = '';
    processColorInput.value = getRandomColor();
    processPriorityInput.value = '5';

    // Log
    addLogEntry(`Process "${name}" created with priority ${priority}`);
}

function updateProcessList() {
    processListContainer.innerHTML = '';
    
    processes.forEach(process => {
        const li = document.createElement('li');
        li.className = 'process-item';
        li.innerHTML = `
            <div>
                <span class="process-color" style="background-color: ${process.color}"></span>
                ${process.name} (Priority: ${process.priority})
            </div>
            <div class="process-actions">
                <button class="action-btn view-process" data-id="${process.id}">View</button>
                <button class="action-btn delete delete-process" data-id="${process.id}">Delete</button>
            </div>
        `;
        processListContainer.appendChild(li);
    });

    // Add event listeners
    document.querySelectorAll('.view-process').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const processId = parseInt(e.target.getAttribute('data-id'));
            showProcessDetails(processId);
        });
    });

    document.querySelectorAll('.delete-process').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const processId = parseInt(e.target.getAttribute('data-id'));
            deleteProcess(processId);
        });
    });
}

function updateProcessSelects() {
    // Clear existing options except the first one
    sourceProcessSelect.innerHTML = '<option value="">Select a process</option>';
    targetProcessSelect.innerHTML = '<option value="">Select a process</option>';
    
    // Add options for each process
    processes.forEach(process => {
        const sourceOption = document.createElement('option');
        sourceOption.value = process.id;
        sourceOption.textContent = process.name;
        sourceProcessSelect.appendChild(sourceOption);
        
        const targetOption = document.createElement('option');
        targetOption.value = process.id;
        targetOption.textContent = process.name;
        targetProcessSelect.appendChild(targetOption);
    });
}

function deleteProcess(processId) {
    // Remove channels connected to this process
    channels = channels.filter(channel => {
        if (channel.sourceId === processId || channel.targetId === processId) {
            addLogEntry(`Channel from "${getProcessById(channel.sourceId).name}" to "${getProcessById(channel.targetId).name}" removed due to process deletion`);
            return false;
        }
        return true;
    });
    
    // Remove the process
    const processName = getProcessById(processId).name;
    processes = processes.filter(p => p.id !== processId);
    
    // Update UI
    updateProcessList();
    updateProcessSelects();
    updateChannelList();
    updateChannelSelect();
    updateVisualization();
    
    // Log
    addLogEntry(`Process "${processName}" deleted`);
}

function showProcessDetails(processId) {
    const process = getProcessById(processId);
    if (!process) return;
    
    const details = process.getDetails();
    
    processDetailsContent.innerHTML = `
        <div class="process-details">
            <p><strong>ID:</strong> ${details.id}</p>
            <p><strong>Name:</strong> ${details.name}</p>
            <p><strong>Priority:</strong> ${details.priority}</p>
            <p><strong>Status:</strong> ${details.status}</p>
            <p><strong>CPU Usage:</strong> ${details.cpuUsage}%</p>
            <p><strong>Memory Usage:</strong> ${details.memoryUsage} MB</p>
            <p><strong>Message Queue:</strong> ${details.messageQueueLength} messages</p>
            <p><strong>Created At:</strong> ${details.createdAt}</p>
            <div class="process-color-preview" style="background-color: ${details.color}; width: 100%; height: 20px; margin-top: 10px; border-radius: 4px;"></div>
        </div>
    `;
    
    processDetailsModal.style.display = 'flex';
}

// Channel Management
createChannelBtn.addEventListener('click', createChannel);

function createChannel() {
    const type = commTypeSelect.value;
    const sourceId = parseInt(sourceProcessSelect.value);
    const targetId = parseInt(targetProcessSelect.value);
    
    if (!sourceId || !targetId) {
        alert('Please select both source and target processes');
        return;
    }
    
    if (sourceId === targetId) {
        alert('Source and target processes must be different');
        return;
    }
    
    // Check if channel already exists
    const channelExists = channels.some(c => 
        c.sourceId === sourceId && c.targetId === targetId && c.type === type
    );
    
    if (channelExists) {
        alert('This channel already exists');
        return;
    }
    
    const channel = new Channel(nextChannelId++, type, sourceId, targetId);
    channels.push(channel);
    
    // Update UI
    updateChannelList();
    updateChannelSelect();
    updateVisualization();
    
    // Reset form
    sourceProcessSelect.value = '';
    targetProcessSelect.value = '';
    
    // Log
    const sourceProcess = getProcessById(sourceId);
    const targetProcess = getProcessById(targetId);
    addLogEntry(`${capitalizeFirstLetter(type)} channel created from "${sourceProcess.name}" to "${targetProcess.name}"`);
}

function updateChannelList() {
    channelListContainer.innerHTML = '';
    
    channels.forEach(channel => {
        const sourceProcess = getProcessById(channel.sourceId);
        const targetProcess = getProcessById(channel.targetId);
        
        const li = document.createElement('li');
        li.className = 'channel-item';
        li.innerHTML = `
            <div>
                ${capitalizeFirstLetter(channel.type)}: ${sourceProcess.name} → ${targetProcess.name}
            </div>
            <div class="channel-actions">
                <button class="action-btn delete delete-channel" data-id="${channel.id}">Delete</button>
            </div>
        `;
        channelListContainer.appendChild(li);
    });
    
    // Add event listeners
    document.querySelectorAll('.delete-channel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const channelId = parseInt(e.target.getAttribute('data-id'));
            deleteChannel(channelId);
        });
    });
}

function updateChannelSelect() {
    // Clear existing options except the first one
    messageChannelSelect.innerHTML = '<option value="">Select a channel</option>';
    
    // Add options for each channel
    channels.forEach(channel => {
        const sourceProcess = getProcessById(channel.sourceId);
        const targetProcess = getProcessById(channel.targetId);
        
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `${capitalizeFirstLetter(channel.type)}: ${sourceProcess.name} → ${targetProcess.name}`;
        messageChannelSelect.appendChild(option);
    });
}

function deleteChannel(channelId) {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;
    
    const sourceProcess = getProcessById(channel.sourceId);
    const targetProcess = getProcessById(channel.targetId);
    
    // Remove the channel
    channels = channels.filter(c => c.id !== channelId);
    
    // Update UI
    updateChannelList();
    updateChannelSelect();
    updateVisualization();
    
    // Log
    addLogEntry(`${capitalizeFirstLetter(channel.type)} channel from "${sourceProcess.name}" to "${targetProcess.name}" deleted`);
}

// Message Passing
sendMessageBtn.addEventListener('click', sendMessage);

function sendMessage() {
    const channelId = parseInt(messageChannelSelect.value);
    const content = messageContentInput.value.trim();
    const size = parseInt(messageSizeInput.value);
    const priority = parseInt(messagePriorityInput.value);
    
    if (!channelId) {
        alert('Please select a channel');
        return;
    }
    
    if (!content) {
        alert('Please enter a message');
        return;
    }
    
    if (size < 1) {
        alert('Message size must be at least 1 byte');
        return;
    }
    
    if (priority < 1 || priority > 10) {
        alert('Priority must be between 1 and 10');
        return;
    }
    
    const message = new Message(nextMessageId++, channelId, content, size, priority);
    messages.push(message);
    
    // Start sending the message
    sendMessageThroughChannel(message);
    
    // Reset form
    messageContentInput.value = '';
    
    // Log
    const channel = getChannelById(channelId);
    const sourceProcess = getProcessById(channel.sourceId);
    const targetProcess = getProcessById(channel.targetId);
    addLogEntry(`Message sent from "${sourceProcess.name}" to "${targetProcess.name}" via ${channel.type}`);
}

function sendMessageThroughChannel(message) {
    const channel = getChannelById(message.channelId);
    if (!channel) return;
    const sourceProcess = getProcessById(channel.sourceId);
    const targetProcess = getProcessById(channel.targetId);
    message.status = 'sending';
    const transmissionTime = (message.size / channel.bandwidth) * 1000 + channel.latency;
    const adjustedTime = transmissionTime / simulationSpeed;
    animateMessageTransmission(sourceProcess, targetProcess, adjustedTime, channel.type);
    setTimeout(() => {
        message.status = 'delivered';
        message.deliveredAt = new Date();
        targetProcess.receiveMessage(message);
        addLogEntry(`Message delivered to "${targetProcess.name}" (${(new Date() - message.createdAt) / 1000}s)`);
        updateVisualization();
    }, adjustedTime);
}

function updateVisualization() {
    visualizationSvg.innerHTML = '';
    const svgRect = visualizationSvg.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    processes.forEach((process, index) => {
        const angle = (index / processes.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);     
        process.updatePosition(x, y);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', process.radius);
        circle.setAttribute('fill', process.color);
        circle.setAttribute('class', 'process-node');
        circle.setAttribute('data-id', process.id);
        if (process.status === 'busy') {
            circle.classList.add('pulse');
        }
        circle.addEventListener('click', () => {
            showProcessDetails(process.id);
        });
        
        visualizationSvg.appendChild(circle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('class', 'process-label');
        text.setAttribute('fill', getContrastColor(process.color));
        text.textContent = process.name;
        visualizationSvg.appendChild(text);
    });
    
    channels.forEach(channel => {
        const sourceProcess = getProcessById(channel.sourceId);
        const targetProcess = getProcessById(channel.targetId);
        
        if (!sourceProcess || !targetProcess) return;
        const dx = targetProcess.x - sourceProcess.x;
        const dy = targetProcess.y - sourceProcess.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate start and end points (on the edge of the circles)
        const startX = sourceProcess.x + nx * sourceProcess.radius;
        const startY = sourceProcess.y + ny * sourceProcess.radius;
        const endX = targetProcess.x - nx * targetProcess.radius;
        const endY = targetProcess.y - ny * targetProcess.radius;
        
        // Draw path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Create a curved path
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        const curveFactor = 30; // Adjust for more or less curve
        
        // Perpendicular vector
        const perpX = -ny;
        const perpY = nx;
        
        const controlX = midX + perpX * curveFactor;
        const controlY = midY + perpY * curveFactor;
        
        path.setAttribute('d', `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`);
        path.setAttribute('class', `channel-path ${channel.type}`);
        
        visualizationSvg.appendChild(path);
    });
}

function animateMessageTransmission(sourceProcess, targetProcess, duration, channelType) {
    // Create a message particle
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('class', 'message-particle');
    
    // Set color based on channel type
    let color;
    switch (channelType) {
        case 'pipe':
            color = '#3498db';
            break;
        case 'message-queue':
            color = '#e67e22';
            break;
        case 'shared-memory':
            color = '#9b59b6';
            break;
        case 'socket':
            color = '#2ecc71';
            break;
        default:
            color = '#3498db';
    }
    
    particle.setAttribute('fill', color);
    visualizationSvg.appendChild(particle);
    
    // Animate along the path
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    function animate() {
        const now = Date.now();
        const progress = Math.min(1, (now - startTime) / duration);
        
        if (progress < 1) {
            // Calculate position along a curved path
            const t = progress;
            const u = 1 - t;
            
            // Calculate midpoint for the quadratic curve
            const midX = (sourceProcess.x + targetProcess.x) / 2;
            const midY = (sourceProcess.y + targetProcess.y) / 2;
            
            // Calculate perpendicular vector for curve control point
            const dx = targetProcess.x - sourceProcess.x;
            const dy = targetProcess.y - sourceProcess.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const nx = dx / distance;
            const ny = dy / distance;
            const perpX = -ny;
            const perpY = nx;
            
            const curveFactor = 30; // Same as in updateVisualization
            const controlX = midX + perpX * curveFactor;
            const controlY = midY + perpY * curveFactor;
            
            // Quadratic Bezier curve formula
            const x = Math.pow(u, 2) * sourceProcess.x + 2 * u * t * controlX + Math.pow(t, 2) * targetProcess.x;
            const y = Math.pow(u, 2) * sourceProcess.y + 2 * u * t * controlY + Math.pow(t, 2) * targetProcess.y;
            
            particle.setAttribute('cx', x);
            particle.setAttribute('cy', y);
            
            requestAnimationFrame(animate);
        } else {
            // Animation complete, remove particle
            visualizationSvg.removeChild(particle);
        }
    }
    
    requestAnimationFrame(animate);
}

// Utility Functions
function getProcessById(id) {
    return processes.find(p => p.id === id);
}

function getChannelById(id) {
    return channels.find(c => c.id === id);
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function addLogEntry(message) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const time = new Date().toLocaleTimeString();
    logEntry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    
    logEntriesContainer.appendChild(logEntry);
    logEntriesContainer.scrollTop = logEntriesContainer.scrollHeight;
}

// Event Listeners
resetSimulationBtn.addEventListener('click', resetSimulation);

function resetSimulation() {
    if (confirm('Are you sure you want to reset the simulation? All processes, channels, and messages will be deleted.')) {
        processes = [];
        channels = [];
        messages = [];
        nextProcessId = 1;
        nextChannelId = 1;
        nextMessageId = 1;
        
        // Update UI
        updateProcessList();
        updateProcessSelects();
        updateChannelList();
        updateChannelSelect();
        updateVisualization();
        
        // Clear log
        logEntriesContainer.innerHTML = '';
        
        // Log
        addLogEntry('Simulation reset');
    }
}

simulationSpeedInput.addEventListener('input', () => {
    simulationSpeed = parseInt(simulationSpeedInput.value);
    addLogEntry(`Simulation speed set to ${simulationSpeed}`);
});

toggleLogBtn.addEventListener('click', () => {
    messageLog.style.display = messageLog.style.display === 'none' ? 'block' : 'none';
});

closeModal.addEventListener('click', () => {
    processDetailsModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === processDetailsModal) {
        processDetailsModal.style.display = 'none';
    }
});

// Initialize
function init() {
    // Set random color initially
    processColorInput.value = getRandomColor();
    
    // Initial visualization
    updateVisualization();
    
    // Log
    addLogEntry('Interprocess Communication Simulator initialized');
    
    // Create some example processes if needed
    // Uncomment to add sample processes on load
    /*
    processes.push(new Process(nextProcessId++, 'Web Server', '#3498db', 8));
    processes.push(new Process(nextProcessId++, 'Database', '#e74c3c', 7));
    processes.push(new Process(nextProcessId++, 'Cache', '#2ecc71', 5));
    updateProcessList();
    updateProcessSelects();
    updateVisualization();
    */
}

// Start the application
init();

// Handle window resize
window.addEventListener('resize', updateVisualization);