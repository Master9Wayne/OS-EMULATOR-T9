const style = document.createElement('style');
style.textContent = `
    /* Remove hover styles from all buttons including Set Blocks, Set Processes, and Initialize Memory */
    button:hover, button:focus,
    .initialize-memory-btn:hover,
    .block-setup button:hover,
    .process-setup button:hover {
        background-color: initial !important;
        outline: none;
        cursor: pointer;
        color: initial !important;
    }
    
    /* Remove increment/decrement arrows from number inputs */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type="number"] {
        -moz-appearance: textfield;
    }
    
    button.active {
        background: blue;
    }

    /* Override active and focus state for reset button */
    #resetButton.active,
    #resetButton:focus {
        background: red !important;
        color: white !important;
    }
    
    .process-segment {
        border: 3px solid black !important;
    }
    
    .setup-container {
        display: flex;
        gap: 20px;
        margin: 20px 0;
        width: 100%;
    }
    
    .block-setup, .process-setup {
        flex: 1;
        width: 48%;
        max-width: 48%;
        padding: 20px;
      background: rgba(128, 128, 128, 0.3); 
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    // Remove this duplicate block-setup section
    /* .block-setup {
        width: 48%;
        padding: 20px;
    background: rgba(128, 128, 128, 0.3); 
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        box-sizing: border-box;
    } */

    .block-setup input[type="number"] {
        width: 100px;
        margin: 5px 0;
    }

    #blockSizesContainer {
        width: 100%;
        margin-top: 15px;
    }

    .block-size-input {
        margin: 10px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .block-size-input label {
        min-width: 150px;
    }

    .process-setup {
        display: none;
    }
    
    .speed-control {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 20px 0;
        padding: 10px;
        background: rgba(128, 128, 128, 0.3);
        border-radius: 8px;
        color: white;
    }
    
    .speed-control input[type="range"] {
        width: 200px;
        height: 10px;
        border-radius: 5px;
    }
    
    .speed-control label {
        font-weight: bold;
        min-width: 120px;
    }
`;
document.head.appendChild(style);

// Then wrap the block-setup and process-setup divs in a container in your HTML:
// Add this right after your first style element
const setupContainer = document.createElement('div');
setupContainer.className = 'setup-container';

// Move existing elements into the container
document.addEventListener('DOMContentLoaded', () => {
    const blockSetup = document.querySelector('.block-setup');
    const processSetup = document.querySelector('.process-setup');
    
    if (blockSetup && processSetup) {
        setupContainer.appendChild(blockSetup);
        setupContainer.appendChild(processSetup);
        
        // Insert the container after the title/header
        const header = document.querySelector('h1') || document.body.firstChild;
        header.parentNode.insertBefore(setupContainer, header.nextSibling);
    }
});

class MemoryBlock {
    constructor(size = 1024) {
        this.totalSize = size;
        this.segments = [];
        this.currentStrategy = 'first';
        this.freeBlocks = [];
        this.lastAllocationEnd = 0;
        this.blockPositions = new Map();
        this.blockRanges = new Map(); // Add this to track block ranges
    }

    initializeFreeBlocks(blocks) {
        // Sort blocks by start position
        this.freeBlocks = blocks.sort((a, b) => a.start - b.start);
        this.segments = [];
        this.lastAllocationEnd = 0;
        this.blockPositions.clear();
        this.blockRanges.clear();
        
        // Store block positions and ranges
        blocks.forEach((block, index) => {
            this.blockPositions.set(block.start, index);
            this.blockRanges.set(index, {
                start: block.start,
                end: block.start + block.size
            });
        });
    }

    allocate(size) {
        let position;
        let selectedBlock;
        
        switch(this.currentStrategy) {
            case 'first':
                [position, selectedBlock] = this.findFirstFit(size);
                break;
            case 'next':
                [position, selectedBlock] = this.findNextFit(size);
                break;
            case 'best':
                [position, selectedBlock] = this.findBestFit(size);
                break;
            case 'worst':
                [position, selectedBlock] = this.findWorstFit(size);
                break;
        }

        if (position !== null && selectedBlock) {
            // Find the correct block number based on position
            let blockNumber = null;
            for (const [index, range] of this.blockRanges) {
                if (position >= range.start && position < range.end) {
                    blockNumber = index;
                    break;
                }
            }

            const remainingSize = selectedBlock.size - size;
            const process = {
                id: Math.random().toString(36).substr(2, 9),
                size: size,
                start: position,
                actualBlock: blockNumber
            };
            
            // Remove the selected block from freeBlocks
            const blockIndex = this.freeBlocks.indexOf(selectedBlock);
            if (blockIndex !== -1) {
                this.freeBlocks.splice(blockIndex, 1);
            }
            
            // If there's remaining space, create a new free block
            if (remainingSize > 0) {
                const newBlock = {
                    id: selectedBlock.id,
                    size: remainingSize,
                    start: position + size
                };
                this.blockPositions.set(newBlock.start, blockNumber);
                this.freeBlocks.push(newBlock);
                this.freeBlocks.sort((a, b) => a.start - b.start);
            }
            
            this.segments.push(process);
            this.segments.sort((a, b) => a.start - b.start);
            return process;
        }
        return null;
    }

    findFirstFit(size) {
        for (let block of this.freeBlocks) {
            if (!this.isBlockOccupied(block) && block.size >= size) {
                return [block.start, block];
            }
        }
        return [null, null];
    }

    findNextFit(size) {
        let startIndex = this.freeBlocks.findIndex(block => block.start >= this.lastAllocationEnd);
        if (startIndex === -1) startIndex = 0;

        for (let i = 0; i < this.freeBlocks.length; i++) {
            const index = (startIndex + i) % this.freeBlocks.length;
            const block = this.freeBlocks[index];
            
            if (!this.isBlockOccupied(block) && block.size >= size) {
                this.lastAllocationEnd = block.start + size;
                return [block.start, block];
            }
        }
        return [null, null];
    }

    findBestFit(size) {
        let bestFit = null;
        let smallestDifference = Infinity;

        for (let block of this.freeBlocks) {
            if (!this.isBlockOccupied(block) && block.size >= size) {
                const difference = block.size - size;
                if (difference < smallestDifference) {
                    smallestDifference = difference;
                    bestFit = block;
                }
            }
        }

        return bestFit ? [bestFit.start, bestFit] : [null, null];
    }

    findWorstFit(size) {
        let worstFit = null;
        let largestDifference = -1;

        for (let block of this.freeBlocks) {
            if (!this.isBlockOccupied(block) && block.size >= size) {
                const difference = block.size - size;
                if (difference > largestDifference) {
                    largestDifference = difference;
                    worstFit = block;
                }
            }
        }

        return worstFit ? [worstFit.start, worstFit] : [null, null];
    }

    isBlockOccupied(block) {
        return this.segments.some(segment => 
            (segment.start >= block.start && segment.start < block.start + block.size) ||
            (segment.start + segment.size > block.start && segment.start + segment.size <= block.start + block.size)
        );
    }

    deallocate(processId) {
        const index = this.segments.findIndex(seg => seg.id === processId);
        if (index !== -1) {
            this.segments.splice(index, 1);
            return true;
        }
        return false;
    }
}

const memory = new MemoryBlock();
const memoryBlock = document.getElementById('memoryBlock');
const waitingProcesses = [];
let simulationSpeed = 1000; // Default speed in milliseconds
let isSimulationRunning = false; // Add this line

visualizeMemoryBlocks();
addSpeedControl(); // Add this line


function initializeMemoryBlocks() {
    const blockCount = parseInt(document.getElementById('blockCount').value);
    const container = document.getElementById('blockSizesContainer');
    const blockSetup = document.querySelector('.block-setup');
    
    // Remove any existing Initialize Memory button
    const existingButtons = blockSetup.querySelectorAll('.initialize-memory-btn');
    existingButtons.forEach(button => button.remove());
    
    container.innerHTML = '';
    
    for (let i = 0; i < blockCount; i++) {
        const div = document.createElement('div');
        div.className = 'block-size-input';
        div.innerHTML = `
            <label for="block${i}">Block ${i} Size (MB):</label>
            <input type="number" id="block${i}" min="1" value="100">
        `;
        container.appendChild(div);

        // Add event listeners for inputs...
        document.getElementById(`block${i}`).addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const nextInput = document.getElementById(`block${i + 1}`);
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                } else {
                    setupMemoryBlocks();
                }
            }
        });

        document.getElementById(`block${i}`).addEventListener('focus', function() {
            this.select();
        });
    }
    
    // Create Initialize Memory button
    const initButton = document.createElement('button');
    initButton.textContent = 'Initialize Memory';
    initButton.className = 'initialize-memory-btn';
    initButton.onclick = setupMemoryBlocks;
    
    blockSetup.appendChild(initButton);
    
    // Focus on first input
    const firstInput = document.getElementById('block0');
    if (firstInput) {
        firstInput.focus();
        firstInput.select();
    }
}

function setupMemoryBlocks() {
    const inputs = document.querySelectorAll('.block-size-input input');
    const blocks = [];
    let currentPosition = 0;
    
    inputs.forEach((input, index) => {
        const size = parseInt(input.value);
        blocks.push({
            id: `block${index}`,
            size: size,
            start: currentPosition
        });
        currentPosition += size;
    });
    
    memory.totalSize = currentPosition;
    memory.initializeFreeBlocks(blocks);
    visualizeMemoryBlocks();
    
    // Show process setup
    const processSetup = document.querySelector('.process-setup');
    if (processSetup) {
        processSetup.style.display = 'block';
        // Focus on process count input
        const processCount = document.getElementById('processCount');
        if (processCount) {
            processCount.focus();
            processCount.select();
        }
    }
}

function generateProcessInputs() {
    const count = parseInt(document.getElementById('processCount').value);
    const container = document.getElementById('processSizesContainer');
    
    container.innerHTML = '';

    // Add process inputs
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'process-size-input';
        div.innerHTML = `
            <label for="process${i}">Process ${i + 1} Size (MB):</label>
            <input type="number" id="process${i}" min="1" value="50">
        `;
        container.appendChild(div);
        
        // Add event listener for Enter key on each process input
        document.getElementById(`process${i}`).addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const nextInput = document.getElementById(`process${i + 1}`);
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                } else {
                    // If it's the last input, move focus to the first strategy button
                    const firstStrategyButton = document.querySelector('.allocation-type button');
                    if (firstStrategyButton) {
                        firstStrategyButton.focus();
                    }
                }
            }
        });
        
        // Select text when focused
        document.getElementById(`process${i}`).addEventListener('focus', function() {
            this.select();
        });
        
        // Save value when input changes
        document.getElementById(`process${i}`).addEventListener('input', function() {
            // Validate and ensure positive numbers
            if (this.value < 0) this.value = 0;
        });
    }
    
    // Remove existing buttons container if it exists
    const existingButtonsContainer = document.querySelector('.buttons-container');
    if (existingButtonsContainer) {
        existingButtonsContainer.remove();
    }
    
    // Create buttons container with full width
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';
    buttonsContainer.style.width = '100%';
    buttonsContainer.style.marginTop = '20px';
    
    // Add strategy buttons in a grid layout
    const strategyButtons = document.createElement('div');
    strategyButtons.className = 'allocation-type';
    strategyButtons.style.display = 'grid';
    strategyButtons.style.gridTemplateColumns = 'repeat(4, 1fr)';
    strategyButtons.style.gap = '10px';
    strategyButtons.style.width = '100%';
    strategyButtons.style.justifyContent = 'center';

    const strategies = [
        {
            name: 'first',
            display: 'First Fit',
            info: 'First Fit algorithm searches from the beginning of memory and allocates the first available free block that is large enough to accomodate the particular process. \n\nIt is the fastest among all strategies as it allocates the first suitable block it finds.'
        },
        {
            name: 'next',
            display: 'Next Fit',
            info: 'Next Fit algorithm starts searching for a free block from the position the last process was allocated and wraps around to the beginning if the last allocated position was the last memory block on the memory strip. \n\nThe search continues till a large enough block is found to accomodate the process till the last allocated position like a circular array.'
        },
        {
            name: 'best',
            display: 'Best Fit',
            info: 'Best Fit algorithm searches the entire memory to find the smallest free block that is large enough to accommodate the process. \n\nWhile it minimizes memory wastage, it is slower as it must search all blocks to find the best fit.'
        },
        {
            name: 'worst',
            display: 'Worst Fit',
            info: 'Worst Fit algorithm allocates the largest available block to the process. \n\nThis strategy leaves larger gaps which might be more useful for larger processes later, but can lead to excessive external fragmentation.'
        }
    ];
    
    // In the strategies.forEach loop, update the keyboard event listener
    strategies.forEach(strategy => {
        const strategyContainer = document.createElement('div');
        strategyContainer.className = 'strategy-container';
        strategyContainer.style.position = 'relative';
        strategyContainer.style.paddingBottom = '25px';
        
        const button = document.createElement('button');
        button.textContent = strategy.display;
        button.style.width = '100%';
        button.style.marginBottom = '10px';
        button.setAttribute('tabindex', '0');
        
        // Single click handler for strategy selection
        button.onclick = () => setAllocationStrategy(strategy.name);
        
        // Only arrow key navigation, no Enter key functionality
        button.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const allButtons = Array.from(document.querySelectorAll('.allocation-type button:not(.info-button)'));
                const currentIndex = allButtons.indexOf(this);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % allButtons.length;
                } else {
                    nextIndex = (currentIndex - 1 + allButtons.length) % allButtons.length;
                }
                
                allButtons[nextIndex].focus();
            }
        });
    
        const infoButton = document.createElement('button');
        infoButton.className = 'info-button';
        infoButton.textContent = 'i';
        infoButton.style.width = '25px';
        infoButton.style.height = '25px';
        infoButton.style.borderRadius = '50%';
        infoButton.style.position = 'absolute';
        infoButton.style.left = '50%';
        infoButton.style.bottom = '0';
        infoButton.style.transform = 'translateX(-50%)';
        infoButton.style.fontSize = '12px';
        infoButton.style.padding = '0';
        infoButton.style.marginTop = '5px';  // Added margin to ensure separation
        
        // Keep the keyboard navigation event listener
        button.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const allButtons = Array.from(document.querySelectorAll('.allocation-type button:not(.info-button)'));
                const currentIndex = allButtons.indexOf(this);
                let nextIndex;
                
                if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % allButtons.length;
                } else {
                    nextIndex = (currentIndex - 1 + allButtons.length) % allButtons.length;
                }
                
                allButtons[nextIndex].focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                setAllocationStrategy(strategy.name);
                allocateAllProcesses();
            }
        });
    
        infoButton.onclick = (e) => {
            e.stopPropagation();
            showStrategyInfo(strategy.display, strategy.info);
        };
    
        strategyContainer.appendChild(button);
        strategyContainer.appendChild(infoButton);
        strategyButtons.appendChild(strategyContainer);
    });
    
    // In generateProcessInputs function, modify the buttons creation section
    // Create allocate button with specific positioning
    const allocateButton = document.createElement('button');
    allocateButton.id = 'allocateButton';
    allocateButton.textContent = 'Allocate Processes';
    allocateButton.onclick = allocateAllProcesses;
    allocateButton.style.display = 'block';
    allocateButton.style.gridColumn = '1'; // First column
    allocateButton.style.marginTop = '10px';
    allocateButton.style.width = '100%';
    allocateButton.style.color = 'white';
    
    // Create stop button
    const stopButton = document.createElement('button');
    stopButton.id = 'stopButton';
    stopButton.textContent = 'Stop Simulation';
    stopButton.onclick = stopSimulation;
    stopButton.style.display = 'block';
    stopButton.style.gridColumn = '2/4'; // Middle columns
    stopButton.style.marginTop = '10px';
    stopButton.style.width = '100%';
    stopButton.style.height = '40px';
    stopButton.style.background = 'orange';
    stopButton.style.color = 'white';
    
    // Create reset button with specific positioning
    const resetButton = document.createElement('button');
    resetButton.id = 'resetButton';
    resetButton.textContent = 'Reset Memory';
    resetButton.onclick = resetMemory;
    resetButton.style.display = 'block';
    resetButton.style.gridColumn = '4'; // Last column
    resetButton.style.marginTop = '10px';
    resetButton.style.width = '100%';
    resetButton.style.height = '40px';
    resetButton.style.background = 'red';
    
    // Add all buttons to the strategy buttons container
    strategyButtons.appendChild(allocateButton);
    strategyButtons.appendChild(stopButton);
    strategyButtons.appendChild(resetButton);
    
    buttonsContainer.appendChild(strategyButtons);
    
    // Insert buttons container after the process setup div
    const processSetup = document.querySelector('.process-setup');
    const controls = document.querySelector('.controls');
    controls.appendChild(buttonsContainer);
    
    // Focus on the first process size input
    const firstProcessInput = document.getElementById('process0');
    if (firstProcessInput) {
        firstProcessInput.focus();
        firstProcessInput.select();
    }

    // Set initial allocation strategy
    setAllocationStrategy('first');
}

function visualizeMemoryBlocks() {
    memoryBlock.innerHTML = '';
    
    // If no blocks are initialized yet, show a single black strip
    if (memory.freeBlocks.length === 0) {
            const blackStrip = document.createElement('div');
            blackStrip.style.width = '100%';
            blackStrip.style.height = '60px';
            blackStrip.style.backgroundColor = 'black';
            blackStrip.style.marginTop = '20px';
            memoryBlock.appendChild(blackStrip);
            return;
        }

        const gap = 10;
        
        memoryBlock.style.marginTop = '-1cm';
        memoryBlock.style.paddingTop = '40px';
        
        const blocksWrapper = document.createElement('div');
        blocksWrapper.style.display = 'flex';
        blocksWrapper.style.gap = `${gap}px`;
        blocksWrapper.style.width = '100%';
        blocksWrapper.style.height = '60px';
        blocksWrapper.style.position = 'relative';
        
        // Create and append block labels first
        const labelsContainer = document.createElement('div');
        labelsContainer.style.position = 'absolute';
    labelsContainer.style.top = '15px';
    labelsContainer.style.left = '0';
    labelsContainer.style.width = '100%';
    labelsContainer.style.display = 'flex';
    labelsContainer.style.gap = `${gap}px`;
    
    memory.freeBlocks.forEach((block, index) => {
        const blockContainer = document.createElement('div');
        blockContainer.className = 'memory-block-segment';
        blockContainer.setAttribute('data-block-index', index);
        
        const width = (block.size / memory.totalSize) * 100;
        
        blockContainer.style.width = `${width}%`;
        blockContainer.style.height = '100%';
        blockContainer.style.position = 'relative';
        blockContainer.style.background = '#fff';
        blockContainer.style.border = '2px solid black';
        
        // Create label in the labels container
        const labelElement = document.createElement('div');
        labelElement.style.width = `${width}%`;
        labelElement.style.textAlign = 'center';
        labelElement.style.fontSize = '15px';
        labelElement.style.fontWeight = 'bold';
        labelElement.style.color = 'white';
        labelElement.textContent = `B${index} (${block.size}MB)`;
        labelsContainer.appendChild(labelElement);
        
        blocksWrapper.appendChild(blockContainer);
    });
    
    memoryBlock.appendChild(labelsContainer);
    memoryBlock.appendChild(blocksWrapper);
}

function addSpeedControl() {
    const speedControl = document.createElement('div');
    speedControl.className = 'speed-control';
    speedControl.style.marginBottom = '60px';
    speedControl.innerHTML = `
        <label>Animation Speed:</label>
        <input type="range" min="100" max="2000" value="1000" step="100">
        <span>1x</span>
    `;

    const slider = speedControl.querySelector('input');
    const speedLabel = speedControl.querySelector('span');

    slider.addEventListener('input', function() {
        const value = parseInt(this.value);
        simulationSpeed = 2100 - value;  // This makes higher values result in lower wait times
        const speedMultiplier = (value - 100) / 1900 * 9.9 + 0.1;
        speedLabel.textContent = `${speedMultiplier.toFixed(1)}x`;
    });

    // Set initial simulation speed
    simulationSpeed = 1100; // 2100 - 1000 (default value)

    memoryBlock.parentNode.insertBefore(speedControl, memoryBlock);
}


async function allocateAllProcesses() {
    isSimulationRunning = true;
    const inputs = document.querySelectorAll('.process-size-input input');
    const sizes = Array.from(inputs).map(input => parseInt(input.value));
    
    memoryBlock.innerHTML = '';
    visualizeMemoryBlocks();
    waitingProcesses.length = 0;
    
    // Add status text container
    const statusText = document.createElement('div');
    statusText.style.textAlign = 'center';
    statusText.style.fontSize = '18px';
    statusText.style.marginBottom = '10px';
    statusText.style.fontWeight = 'bold';
    memoryBlock.insertBefore(statusText, memoryBlock.firstChild);
    
    // Add pointer element
    const pointer = document.createElement('div');
    pointer.style.position = 'absolute';
    pointer.style.top = '-15px';
    pointer.style.width = '20px';
    pointer.style.height = '20px';
    pointer.style.background = 'red';
    pointer.style.clipPath = 'polygon(50% 100%, 0 0, 100% 0)';
    pointer.style.transition = 'left 0.5s ease-in-out';
    pointer.style.zIndex = '1000';
    
    for (let i = 0; i < sizes.length; i++) {
        if (!isSimulationRunning) {
            return; // Exit if simulation is stopped
        }
        const size = sizes[i];
        if (isNaN(size) || size <= 0) {
            alert(`Please enter a valid size for Process ${i + 1}!`);
            return;
        }
        
        statusText.style.color = '#00FFFF';
        statusText.textContent = `Finding suitable block for P${i + 1} (${size}MB)...`;
        const blockContainer = document.querySelector('.memory-block-segment').parentElement;
        blockContainer.appendChild(pointer);
        
        // Animate block finding based on strategy
        const [position, selectedBlock] = await animateBlockFinding(size, pointer);
        
        if (position !== null && selectedBlock) {
            const allocated = memory.allocate(size);
            if (allocated) {
                allocated.processNumber = i + 1;
                await animateAllocation(allocated, i + 1);
            }
        } else {
            waitingProcesses.push({
                id: i + 1,
                processNumber: i + 1,
                size: size
            });
            statusText.style.color = 'orange';
            statusText.textContent = `No suitable block found for P${i + 1} (${size}MB)`;
            // Replace all instances of:
            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
            // With:
            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
            
            // Replace all instances of:
            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
            // With:
            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
        }
    }
    
    statusText.remove();
    pointer.remove();
    updateWaitingProcessesList();
    displayAllocationTables();
    isSimulationRunning = false;
}

// Add this function near other control functions



async function animateBlockFinding(size, pointer) {
    pointer.style.background = 'red'; 
    const blocks = document.querySelectorAll('.memory-block-segment');
    let position = null;
    let selectedBlock = null;
    
    switch(memory.currentStrategy) {
        case 'first':
            for (let i = 0; i < memory.freeBlocks.length; i++) {
                const block = memory.freeBlocks[i];
                // Find the corresponding block element using block's start position
                const blockIndex = Array.from(blocks).findIndex(el => 
                    parseInt(el.getAttribute('data-block-index')) === memory.blockPositions.get(block.start)
                );
                const blockElement = blocks[blockIndex];
                
                if (blockElement) {
                    const rect = blockElement.getBoundingClientRect();
                    const parentRect = blockElement.parentElement.getBoundingClientRect();
                    
                    // Calculate the absolute position of the pointer
                    const blockCenterX = rect.left + (rect.width *0.97);
                    const pointerLeft = blockCenterX - parentRect.left - 10;
                    
                    // Update pointer position with the correct offset
                    pointer.style.left = `${pointerLeft}px`;
                    await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                    
                    if (!memory.isBlockOccupied(block) && block.size >= size) {
                        position = block.start;
                        selectedBlock = block;
                        pointer.style.background = '#00FF00';
                        // Add pause at the selected block
                        await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                        break;
                    }
                }
            }
            break;
            
            case 'next':
                let startIndex = 0;
                // Find the correct starting block index based on lastAllocationEnd
                for (let i = 0; i < memory.freeBlocks.length; i++) {
                    const block = memory.freeBlocks[i];
                    if (block.start >= memory.lastAllocationEnd) {
                        startIndex = i;
                        break;
                    }
                }
                
                let blocksChecked = 0;
                while (blocksChecked < memory.freeBlocks.length) {
                    const currentIndex = (startIndex + blocksChecked) % memory.freeBlocks.length;
                    const block = memory.freeBlocks[currentIndex];
                    
                    // Find the visual block element that corresponds to this block's position
                    const visualBlockIndex = Array.from(blocks).findIndex(el => 
                        parseInt(el.getAttribute('data-block-index')) === memory.blockPositions.get(block.start)
                    );
                    
                    if (visualBlockIndex !== -1) {
                        const blockElement = blocks[visualBlockIndex];
                        const rect = blockElement.getBoundingClientRect();
                        const parentRect = blockElement.parentElement.getBoundingClientRect();
                        
                        const blockCenterX = rect.left + (rect.width *0.97);
                        const pointerLeft = blockCenterX - parentRect.left - 10;
                        pointer.style.left = `${pointerLeft}px`;
                        await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                        
                        if (!memory.isBlockOccupied(block) && block.size >= size) {
                            position = block.start;
                            selectedBlock = block;
                            pointer.style.background = '#00FF00';
                            memory.lastAllocationEnd = block.start;  // Update to start of current block
                            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                            break;
                        }
                    }
                    blocksChecked++;
                }
                
                // If we've wrapped around and found nothing, reset lastAllocationEnd
                if (blocksChecked === memory.freeBlocks.length) {
                    memory.lastAllocationEnd = 0;
                }
                break;
            
                case 'best':
                    let bestDiff = Infinity;
                    
                    for (let i = 0; i < memory.freeBlocks.length; i++) {
                        const block = memory.freeBlocks[i];
                        // Find the corresponding block element using block's start position
                        const blockIndex = Array.from(blocks).findIndex(el => 
                            parseInt(el.getAttribute('data-block-index')) === memory.blockPositions.get(block.start)
                        );
                        const blockElement = blocks[blockIndex];
                        
                        if (blockElement) {
                            const rect = blockElement.getBoundingClientRect();
                            const parentRect = blockElement.parentElement.getBoundingClientRect();
                            
                            const blockCenterX = rect.left + (rect.width *0.97);
                            const pointerLeft = blockCenterX - parentRect.left - 10;
                            pointer.style.left = `${pointerLeft}px`;
                            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                            
                            if (!memory.isBlockOccupied(block) && block.size >= size) {
                                const diff = block.size - size;
                                if (diff < bestDiff) {
                                    bestDiff = diff;
                                    position = block.start;
                                    selectedBlock = block;
                                }
                            }
                        }
                    }
                    
                    // Move pointer to the best block found after checking all blocks
                    if (selectedBlock) {
                        const bestBlockIndex = Array.from(blocks).findIndex(el => 
                            parseInt(el.getAttribute('data-block-index')) === memory.blockPositions.get(selectedBlock.start)
                        );
                        const bestBlockElement = blocks[bestBlockIndex];
                        if (bestBlockElement) {
                            const bestRect = bestBlockElement.getBoundingClientRect();
                            const parentRect = bestBlockElement.parentElement.getBoundingClientRect();
                            const bestCenterX = bestRect.left + (bestRect.width * 0.97);
                            pointer.style.left = `${bestCenterX - parentRect.left - 10}px`;
                            pointer.style.background = '#00FF00';
                            await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                        }
                    }
                    break;
            
                    case 'worst':
                        let worstDiff = -1;
                        let checkedBlocks = [];
                        
                        for (let i = 0; i < memory.freeBlocks.length; i++) {
                            const block = memory.freeBlocks[i];
                            // Find the corresponding block element using block's start position
                            const blockIndex = Array.from(blocks).findIndex(el => 
                                parseInt(el.getAttribute('data-block-index')) === memory.blockPositions.get(block.start)
                            );
                            const blockElement = blocks[blockIndex];
                            
                            if (blockElement) {
                                const rect = blockElement.getBoundingClientRect();
                                const parentRect = blockElement.parentElement.getBoundingClientRect();
                                
                                const blockCenterX = rect.left + (rect.width * 0.97);
                                const pointerLeft = blockCenterX - parentRect.left - 10;
                                pointer.style.left = `${pointerLeft}px`;
                                await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                                
                                if (!memory.isBlockOccupied(block) && block.size >= size) {
                                    const diff = block.size - size;
                                    checkedBlocks.push({ block, diff });
                                    
                                    if (diff > worstDiff) {
                                        worstDiff = diff;
                                        position = block.start;
                                        selectedBlock = block;
                                    }
                                }
                            }
                        }
                        
                        // If we found multiple blocks with the same worst difference, select the first one
                        if (checkedBlocks.length > 0) {
                            const worstBlocks = checkedBlocks.filter(b => b.diff === worstDiff);
                            if (worstBlocks.length > 0) {
                                selectedBlock = worstBlocks[0].block;
                                position = selectedBlock.start;
                                
                                // Move pointer to the selected worst block
                                const finalBlockIndex = Array.from(blocks).findIndex(el => 
                                    parseInt(el.getAttribute('data-block-index')) === memory.blockPositions.get(position)
                                );
                                if (finalBlockIndex !== -1) {
                                    const finalBlock = blocks[finalBlockIndex];
                                    const rect = finalBlock.getBoundingClientRect();
                                    const parentRect = finalBlock.parentElement.getBoundingClientRect();
                                    const centerX = rect.left + (rect.width * 0.97);
                                    pointer.style.left = `${centerX - parentRect.left - 10}px`;
                                    pointer.style.background = '#00FF00';
                                    await new Promise(resolve => setTimeout(resolve, simulationSpeed));
                                }
                            }
                        }
                        break;
                    }

    if (selectedBlock) {
        const statusText = document.querySelector('#memoryBlock > div');
        statusText.style.color = '#00FF00';  // Green color
        const blockNumber = memory.blockPositions.get(selectedBlock.start);
        const processNumber = memory.segments.length + 1;  // Next process number
        statusText.textContent = `Block ${blockNumber} is suitable for P${processNumber} (${size}MB)`;
        await new Promise(resolve => setTimeout(resolve, simulationSpeed));
    }
    
    return [position, selectedBlock];
}

function displayAllocationTables() {
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'allocation-tables';
    tablesContainer.style.marginTop = ''; 
    
    // Create allocation table
    const allocationTable = document.createElement('table');
    allocationTable.innerHTML = `
        <thead>
            <tr>
                <th>Process Number</th>
                <th>Process Size (MB)</th>
                <th>Block Number</th>
            </tr>
        </thead>
        <tbody>
            ${[...memory.segments, ...waitingProcesses].sort((a, b) => 
                (a.processNumber || parseInt(a.id)) - (b.processNumber || parseInt(b.id))
            ).map(process => {
                const isAllocated = memory.segments.includes(process);
                return `
                    <tr>
                        <td>P${process.processNumber || process.id}</td>
                        <td>${process.size}</td>
                        <td>${isAllocated ? process.actualBlock : '-'}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

    // Create fragmentation table
    const fragmentationTable = document.createElement('table');
    fragmentationTable.innerHTML = `
        <thead>
            <tr>
                <th>Block Number</th>
                <th>Fragment Size (MB)</th>
            </tr>
        </thead>
        <tbody>
            ${memory.freeBlocks.map(block => {
                const blockNumber = memory.blockPositions.get(block.start);
                const usedSpace = memory.segments
                    .filter(seg => seg.start >= block.start && seg.start < block.start + block.size)
                    .reduce((total, seg) => total + seg.size, 0);
                const fragmentSize = block.size - usedSpace;
                return fragmentSize > 0 ? `
                    <tr>
                        <td>${blockNumber !== undefined ? blockNumber : '-'}</td>
                        <td>${fragmentSize}</td>
                    </tr>
                ` : '';
            }).join('')}
        </tbody>
    `;

    // Add titles and append tables
    const allocationTitle = document.createElement('h3');
    allocationTitle.textContent = 'Process Allocation Details';
    const fragmentationTitle = document.createElement('h3');
    fragmentationTitle.textContent = 'Block Fragmentation Details';

    tablesContainer.appendChild(allocationTitle);
    tablesContainer.appendChild(allocationTable);
    tablesContainer.appendChild(fragmentationTitle);
    tablesContainer.appendChild(fragmentationTable);

    // Update styles for tables with side-by-side layout
    const tableStyles = document.createElement('style');
    tableStyles.textContent = `
        .allocation-tables {
            margin: 20px 0;
            padding: 10px;
            display: flex;
            flex-direction: row;
            gap: 20px;
            justify-content: center;
            font-family: Arial, sans-serif;
        }
        .allocation-tables > div {
            flex: 1;
            max-width: 45%;
        }
        .allocation-tables table {
            border-collapse: collapse;
            margin: 10px 0;
            width: 100%;
            box-shadow: 0 0 3px rgba(0,0,0,0.2);
        }
        .allocation-tables th, .allocation-tables td {
            border: 2px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 0.9em;
        }
        .allocation-tables th {
            background-color: #f2f2f2;
            font-weight: bold;
            color : black;
        }
        .allocation-tables h3 {
            margin: 10px 0;
            color: white;
            font-size: 1.1em;
            text-align: center;
        }
    `;
    document.head.appendChild(tableStyles);

    // Wrap tables in separate divs
    const leftDiv = document.createElement('div');
    leftDiv.appendChild(allocationTitle);
    leftDiv.appendChild(allocationTable);

    const rightDiv = document.createElement('div');
    rightDiv.appendChild(fragmentationTitle);
    rightDiv.appendChild(fragmentationTable);

    tablesContainer.appendChild(leftDiv);
    tablesContainer.appendChild(rightDiv);

    // Find or create container and update
    let tablesSection = document.getElementById('allocationTables');
    if (!tablesSection) {
        tablesSection = document.createElement('div');
        tablesSection.id = 'allocationTables';
        const memoryBlock = document.getElementById('memoryBlock');
        memoryBlock.parentNode.insertBefore(tablesSection, memoryBlock.nextSibling);
    }
    tablesSection.innerHTML = '';
    tablesSection.appendChild(tablesContainer);
}

async function animateAllocation(process, processNumber) {
    return new Promise(resolve => {
        const processElement = document.createElement('div');
        processElement.className = 'process-segment';
        
        // Find the container block
        const blockContainer = document.querySelector(`.memory-block-segment[data-block-index="${process.actualBlock}"]`);
        
        if (!blockContainer) {
            resolve();
            return;
        }
        
        // Calculate relative position within the block
        const blockSize = memory.freeBlocks.find(b => b.start === process.start)?.size || 
                         memory.blockRanges.get(process.actualBlock).end - 
                         memory.blockRanges.get(process.actualBlock).start;
                         
        const relativeStart = process.start - memory.blockRanges.get(process.actualBlock).start;
        const relativePosition = (relativeStart / blockSize) * 100;
        const width = (process.size / blockSize) * 100;
        
        // Style the process element
        processElement.style.position = 'absolute';
        processElement.style.left = `${relativePosition}%`;
        processElement.style.width = `${width}%`;
        processElement.style.height = '100%'; // Full height
        processElement.style.bottom = '0';
        processElement.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 30%)`;
        processElement.style.border = '2px solid black';
        processElement.innerHTML = `P${processNumber} (${process.size}MB)`;
        processElement.onclick = () => deallocateProcess(process.id);
        
        blockContainer.appendChild(processElement);
        setTimeout(resolve, simulationSpeed);
    });
}


function setAllocationStrategy(strategy) {
    memory.currentStrategy = strategy;
    document.querySelectorAll('.allocation-type button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(strategy)) {
            btn.classList.add('active');
        }
    });
}


function deallocateProcess(processId) {
    if (memory.deallocate(processId)) {
        visualizeMemoryBlocks();
        memory.segments.forEach((segment, index) => {
            const processElement = document.createElement('div');
            processElement.className = 'process-segment';
            
            const blockContainer = document.querySelector(`.memory-block-segment[data-block-index="${segment.actualBlock}"]`);
            if (!blockContainer) return;
            
            const blockSize = memory.blockRanges.get(segment.actualBlock).end - 
                            memory.blockRanges.get(segment.actualBlock).start;
            const relativeStart = segment.start - memory.blockRanges.get(segment.actualBlock).start;
            const relativePosition = (relativeStart / blockSize) * 100;
            const width = (segment.size / blockSize) * 100;
            
            processElement.style.position = 'absolute';
            processElement.style.left = `${relativePosition}%`;
            processElement.style.width = `${width}%`;
            processElement.style.height = '80%';
            processElement.style.bottom = '0';
            processElement.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 30%)`;
            processElement.style.border = '2px solid black';
            processElement.innerHTML = `P${index + 1} (${segment.size}MB)`;
            processElement.onclick = () => deallocateProcess(segment.id);
            
            blockContainer.appendChild(processElement);
        });
    }
}



function updateWaitingProcessesList() {
    const processList = document.getElementById('processList');
    processList.innerHTML = '<h3>Non-allocated Processes</h3>';
    
    if (waitingProcesses.length > 0) {
        const waitingList = document.createElement('div');
        waitingList.className = 'waiting-processes';
        waitingList.innerHTML = `
            <h3>Processes Waiting for Allocation:</h3>
            <ul>
                ${waitingProcesses.map(process => 
                    `<li>Process ${process.id} (${process.size}MB)</li>`
                ).join('')}
            </ul>
        `;
        processList.appendChild(waitingList);
    }
}

// Add this new function before initializeMemoryBlocks()
function resetMemory() {
    // Get the initial block sizes from inputs
    const inputs = document.querySelectorAll('.block-size-input input');
    const blocks = [];
    let currentPosition = 0;

    inputs.forEach((input, index) => {
        const size = parseInt(input.value);
        blocks.push({
            id: `block${index}`,
            size: size,
            start: currentPosition
        });
        currentPosition += size;
    });

    // Reset memory to initial state
    memory.totalSize = currentPosition;
    memory.segments = [];
    memory.lastAllocationEnd = 0;
    memory.initializeFreeBlocks(blocks);
    
    // Reset visualization
    visualizeMemoryBlocks();
    
    // Clear waiting processes
    waitingProcesses.length = 0;
    updateWaitingProcessesList();
}

async function stopSimulation() {
    isSimulationRunning = false;
    resetMemory();
    
    // Clear any status text
    const statusText = document.querySelector('#memoryBlock > div');
    if (statusText) {
        statusText.remove();
    }
    
    // Remove any pointer
    const pointer = document.querySelector('.memory-block-segment').parentElement.querySelector('div[style*="clip-path"]');
    if (pointer) {
        pointer.remove();
    }
    
    // Clear allocation tables
    const tablesSection = document.getElementById('allocationTables');
    if (tablesSection) {
        tablesSection.innerHTML = '';
    }
}


function initializeMemoryBlocks() {
    const blockCount = parseInt(document.getElementById('blockCount').value);
    const container = document.getElementById('blockSizesContainer');
    const blockSetup = document.querySelector('.block-setup');
    
    // Remove any existing Initialize Memory button
    const existingButtons = blockSetup.querySelectorAll('.initialize-memory-btn');
    existingButtons.forEach(button => button.remove());
    
    container.innerHTML = '';

    for (let i = 0; i < blockCount; i++) {
        const div = document.createElement('div');
        div.className = 'block-size-input';
        div.innerHTML = `
            <label for="block${i}">Block ${i} Size (MB):</label>
            <input type="number" id="block${i}" min="1" value="100">
        `;
        container.appendChild(div);

        // Add event listeners for inputs...
        document.getElementById(`block${i}`).addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const nextInput = document.getElementById(`block${i + 1}`);
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                } else {
                    setupMemoryBlocks();
                }
            }
        });

        document.getElementById(`block${i}`).addEventListener('focus', function() {
            this.select();
        });
    }

    // Create Initialize Memory button
    const initButton = document.createElement('button');
    initButton.textContent = 'Initialize Memory';
    initButton.className = 'initialize-memory-btn';
    initButton.onclick = setupMemoryBlocks;
    
    blockSetup.appendChild(initButton);

    // Focus on first input
    const firstInput = document.getElementById('block0');
    if (firstInput) {
        firstInput.focus();
        firstInput.select();
    }
}

// Modify the blockCount event listener
document.addEventListener('DOMContentLoaded', () => {
    const blockCountInput = document.getElementById('blockCount');
    if (blockCountInput) {
        blockCountInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                initializeMemoryBlocks();
            }
        });
    }

    const processCountInput = document.getElementById('processCount');
    if (processCountInput) {
        processCountInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generateProcessInputs();
            }
        });
    }
});

// Add this function after the setAllocationStrategy function
function showStrategyInfo(title, info) {
    const dialog = document.querySelector('.strategy-info-dialog');
    const overlay = document.querySelector('.dialog-overlay');
    
    dialog.querySelector('h3').textContent = title;
    dialog.querySelector('p').textContent = info;
    
    dialog.style.display = 'block';
    overlay.style.display = 'block';

    // Close dialog when clicking overlay or close button
    const closeDialog = () => {
        dialog.style.display = 'none';
        overlay.style.display = 'none';
    };

    dialog.querySelector('.close-dialog').onclick = closeDialog;
    overlay.onclick = closeDialog;

    // Close dialog on ESC key
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}