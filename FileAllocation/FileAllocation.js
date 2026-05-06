document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const totalBlocksInput = document.getElementById('total-blocks');
    const numFilesInput = document.getElementById('num-files');
    const fileSizesContainer = document.getElementById('file-sizes-container');
    const allocationMethodSelect = document.getElementById('allocation-method');
    const runSimulationBtn = document.getElementById('run-simulation');
    const resetSimulationBtn = document.getElementById('reset-simulation');
    const diskContainer = document.getElementById('disk-container');
    const allocationInfo = document.getElementById('allocation-info');

    // Variables
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
        '#F7B801', '#7F7EFF', '#EF476F', '#3BCEAC', '#FC7307'
    ];
    let diskBlocks = [];
    let files = [];
    let initialSetupComplete = false;

    // Initialize
    initialize();

    // Event Listeners
    numFilesInput.addEventListener('change', updateFileSizeInputs);
    runSimulationBtn.addEventListener('click', runSimulation);
    resetSimulationBtn.addEventListener('click', resetSimulation);

    // Functions
    function initialize() {
        updateFileSizeInputs();
        setupInitialDiskBlocks();
    }

    function updateFileSizeInputs() {
        const numFiles = parseInt(numFilesInput.value);
        fileSizesContainer.innerHTML = '';

        for (let i = 0; i < numFiles; i++) {
            const fileInput = document.createElement('div');
            fileInput.classList.add('file-size-input');
            fileInput.innerHTML = `
                <label for="file-size-${i}">File ${i + 1} Size (blocks):</label>
                <input type="number" id="file-size-${i}" class="file-size" min="1" max="20" value="${Math.floor(Math.random() * 5) + 2}">
            `;
            fileSizesContainer.appendChild(fileInput);
        }
    }

    function setupInitialDiskBlocks() {
        // Clear previous setup
        diskBlocks = [];
        diskContainer.innerHTML = '';
        allocationInfo.innerHTML = '<p>Click on disk blocks to mark them as already allocated (busy) before running the simulation.</p>';
        
        // Get total blocks
        const totalBlocks = parseInt(totalBlocksInput.value);
        
        // Initialize disk blocks
        for (let i = 0; i < totalBlocks; i++) {
            diskBlocks.push({
                id: i,
                allocated: false,
                fileId: null,
                isIndex: false,
                nextBlock: null,
                initiallyBusy: false
            });
        }
        
        // Render clickable disk blocks for setup
        renderInitialDiskBlocks();
        
        // Update button text
        runSimulationBtn.textContent = "Run Simulation";
        initialSetupComplete = true;
    }

    function renderInitialDiskBlocks() {
        diskContainer.innerHTML = '';
        
        for (let i = 0; i < diskBlocks.length; i++) {
            const block = diskBlocks[i];
            const blockElement = document.createElement('div');
            blockElement.classList.add('disk-block');
            blockElement.textContent = i;
            
            if (block.initiallyBusy) {
                blockElement.classList.add('busy');
                blockElement.innerHTML = `<span>${i}</span><span class="busy-mark">X</span>`;
            } else {
                blockElement.classList.add('free');
            }
            
            // Add click event to toggle busy state
            blockElement.addEventListener('click', function() {
                toggleBlockBusyState(i);
            });
            
            diskContainer.appendChild(blockElement);
        }

        // Add legend
        const legend = document.createElement('div');
        legend.classList.add('legend');
        
        // Add free and busy blocks to legend
        const freeItem = document.createElement('div');
        freeItem.classList.add('legend-item');
        freeItem.innerHTML = `
            <div class="legend-color" style="background-color: #eee;"></div>
            <span>Free Block</span>
        `;
        legend.appendChild(freeItem);
        
        const busyItem = document.createElement('div');
        busyItem.classList.add('legend-item');
        busyItem.innerHTML = `
            <div class="legend-color" style="background-color: #ff0000;"></div>
            <span>Already Allocated Block</span>
        `;
        legend.appendChild(busyItem);
        
        diskContainer.appendChild(legend);
    }

    function toggleBlockBusyState(blockId) {
        diskBlocks[blockId].initiallyBusy = !diskBlocks[blockId].initiallyBusy;
        diskBlocks[blockId].allocated = diskBlocks[blockId].initiallyBusy;
        renderInitialDiskBlocks();
    }

    function resetSimulation() {
        diskBlocks = [];
        files = [];
        initialSetupComplete = false;
        diskContainer.innerHTML = '';
        allocationInfo.innerHTML = '';
        updateFileSizeInputs();
        setupInitialDiskBlocks();
    }

    function runSimulation() {
        // If setup isn't complete yet or we need to reset for a new simulation
        if (!initialSetupComplete) {
            setupInitialDiskBlocks();
            return;
        }
        
        // Reset previous simulation but keep initially busy blocks
        files = [];
        
        // For each block, reset allocation but keep initiallyBusy flag
        for (let i = 0; i < diskBlocks.length; i++) {
            // If block was initially marked as busy, keep it allocated
            // Otherwise, reset allocation status
            if (!diskBlocks[i].initiallyBusy) {
                diskBlocks[i].allocated = false;
                diskBlocks[i].fileId = null;
                diskBlocks[i].isIndex = false;
                diskBlocks[i].nextBlock = null;
            }
        }

        // Get inputs
        const totalBlocks = diskBlocks.length;
        const numFiles = parseInt(numFilesInput.value);
        const allocationMethod = allocationMethodSelect.value;
        
        // Validate inputs
        if (numFiles < 1 || numFiles > 10 || isNaN(numFiles)) {
            alert('Number of files must be between 1 and 10');
            return;
        }

        // Count free blocks
        const freeBlocksCount = diskBlocks.filter(block => !block.allocated).length;

        // Create files with sizes
        const fileSizeInputs = document.querySelectorAll('.file-size');
        let totalFileSize = 0;
        
        for (let i = 0; i < numFiles; i++) {
            const size = parseInt(fileSizeInputs[i].value);
            
            if (size < 1 || isNaN(size)) {
                alert(`Invalid size for File ${i + 1}`);
                return;
            }
            
            files.push({
                id: i,
                name: `F${i + 1}`,
                size: size,
                color: colors[i % colors.length],
                blocks: []
            });
            
            totalFileSize += size;
        }

        // Add extra blocks for index blocks if using indexed allocation
        if (allocationMethod === 'indexed') {
            totalFileSize += numFiles; // One index block per file
        }

        // Check if there's enough space
        if (totalFileSize > freeBlocksCount) {
            alert(`Not enough free disk blocks for all files. Need ${totalFileSize} blocks, but only ${freeBlocksCount} are available.`);
            return;
        }

        // Allocate files based on method
        let allocationSuccess = false;
        
        switch(allocationMethod) {
            case 'contiguous':
                allocationSuccess = allocateContiguous();
                break;
            case 'linked':
                allocationSuccess = allocateLinked();
                break;
            case 'indexed':
                allocationSuccess = allocateIndexed();
                break;
             case 'multilevel':
    allocationSuccess = allocateMultilevelIndexed();
    break;

        }
        
        if (!allocationSuccess) {
            return; // Allocation failed, error message already shown
        }

        // Render disk blocks
        renderDiskBlocks();
        
        // Display allocation info
        displayAllocationInfo(allocationMethod);
    }

    function allocateContiguous() {
        for (let file of files) {
            let startBlock = parseInt(prompt(`Enter starting block for ${file.name}:`));
            let endBlock = parseInt(prompt(`Enter ending block for ${file.name}:`));
    
            if (isNaN(startBlock) || isNaN(endBlock) || startBlock < 0 || endBlock >= diskBlocks.length || startBlock > endBlock) {
                alert("Invalid block range.");
                return false;
            }
    
            let size = endBlock - startBlock + 1;
            if (size !== file.size) {
                alert(`Block range size (${size}) does not match file size (${file.size}).`);
                return false;
            }
    
            // Check if all blocks in range are free
            for (let i = startBlock; i <= endBlock; i++) {
                if (diskBlocks[i].allocated) {
                    alert(`Block ${i} is already allocated. Choose another range.`);
                    return false;
                }
            }
    
            // Allocate blocks
            for (let i = startBlock; i <= endBlock; i++) {
                diskBlocks[i].allocated = true;
                diskBlocks[i].fileId = file.id;
                file.blocks.push(i);
            }
        }
        return true;
    }
    
    function allocateLinked() {
        for (let file of files) {
            let blockChainInput = prompt(`Enter ${file.size} space-separated block indices for ${file.name} (in order):`);
            if (!blockChainInput) return false;
    
            let blockIndices = blockChainInput.split(" ").map(Number);
    
            if (blockIndices.length !== file.size) {
                alert(`You must enter exactly ${file.size} blocks.`);
                return false;
            }
    
            for (let i = 0; i < blockIndices.length; i++) {
                let index = blockIndices[i];
                if (isNaN(index) || index < 0 || index >= diskBlocks.length) {
                    alert(`Invalid block index: ${index}`);
                    return false;
                }
                if (diskBlocks[index].allocated) {
                    alert(`Block ${index} is already allocated.`);
                    return false;
                }
            }
    
            // Allocate and link blocks
            for (let i = 0; i < blockIndices.length; i++) {
                const idx = blockIndices[i];
                diskBlocks[idx].allocated = true;
                diskBlocks[idx].fileId = file.id;
                if (i < blockIndices.length - 1) {
                    diskBlocks[idx].nextBlock = blockIndices[i + 1];
                }
                file.blocks.push(idx);
            }
        }
        return true;
    }
    function allocateIndexed() {
        for (let file of files) {
            let indexBlock = parseInt(prompt(`Enter index block number for ${file.name}:`));
            if (isNaN(indexBlock) || indexBlock < 0 || indexBlock >= diskBlocks.length) {
                alert("Invalid index block number.");
                return false;
            }
            if (diskBlocks[indexBlock].allocated) {
                alert(`Block ${indexBlock} is already allocated.`);
                return false;
            }
    
            let dataBlocksInput = prompt(`Enter ${file.size} space-separated data block numbers for ${file.name}:`);
            if (!dataBlocksInput) return false;
    
            let dataIndices = dataBlocksInput.split(" ").map(Number);
            if (dataIndices.length !== file.size) {
                alert(`You must enter exactly ${file.size} data blocks.`);
                return false;
            }
    
            for (let idx of dataIndices) {
                if (isNaN(idx) || idx < 0 || idx >= diskBlocks.length) {
                    alert(`Invalid block number: ${idx}`);
                    return false;
                }
                if (diskBlocks[idx].allocated) {
                    alert(`Block ${idx} is already allocated.`);
                    return false;
                }
            }
    
            // Allocate index block
            diskBlocks[indexBlock].allocated = true;
            diskBlocks[indexBlock].fileId = file.id;
            diskBlocks[indexBlock].isIndex = true;
            file.indexBlock = indexBlock;
    
            // Allocate data blocks
            for (let idx of dataIndices) {
                diskBlocks[idx].allocated = true;
                diskBlocks[idx].fileId = file.id;
                file.blocks.push(idx);
            }
        }
        return true;
    }

    function allocateMultilevelIndexed() {
        for (let file of files) {
            let mainIndexBlock = parseInt(prompt(`Enter MAIN index block number for ${file.name}:`));
            if (isNaN(mainIndexBlock) || mainIndexBlock < 0 || mainIndexBlock >= diskBlocks.length || diskBlocks[mainIndexBlock].allocated) {
                alert("Invalid or already allocated main index block.");
                return false;
            }
    
            diskBlocks[mainIndexBlock].allocated = true;
            diskBlocks[mainIndexBlock].fileId = file.id;
            diskBlocks[mainIndexBlock].isIndex = true;
            file.indexBlock = mainIndexBlock;
            file.subIndexes = [];
    
            let subCount = Math.ceil(file.size / 4);
            for (let i = 0; i < subCount; i++) {
                let subIndex = parseInt(prompt(`Enter SUB index block ${i + 1} for ${file.name}:`));
                if (isNaN(subIndex) || subIndex < 0 || subIndex >= diskBlocks.length || diskBlocks[subIndex].allocated) {
                    alert("Invalid or already allocated sub-index block.");
                    return false;
                }
    
                diskBlocks[subIndex].allocated = true;
                diskBlocks[subIndex].fileId = file.id;
                diskBlocks[subIndex].isIndex = true;
                file.subIndexes.push(subIndex);
    
                let blocksInput = prompt(`Enter up to 4 data blocks for sub-index ${i + 1} (space-separated):`);
                let dataBlocks = blocksInput.split(" ").map(Number);
    
                if (dataBlocks.length < 1 || dataBlocks.length > 4) {
                    alert("Each sub-index must point to 1–4 data blocks.");
                    return false;
                }
    
                for (let b of dataBlocks) {
                    if (isNaN(b) || b < 0 || b >= diskBlocks.length || diskBlocks[b].allocated) {
                        alert(`Invalid or already allocated block: ${b}`);
                        return false;
                    }
                }
    
                for (let b of dataBlocks) {
                    diskBlocks[b].allocated = true;
                    diskBlocks[b].fileId = file.id;
                    file.blocks.push(b);
                }
            }
        }
        return true;
    }
       
        

    function renderDiskBlocks() {
        diskContainer.innerHTML = '';
        
        for (let i = 0; i < diskBlocks.length; i++) {
            const block = diskBlocks[i];
            const blockElement = document.createElement('div');
            blockElement.classList.add('disk-block');
            
            if (block.initiallyBusy && !block.fileId) {
                // Initially busy block that hasn't been allocated to a file
                blockElement.classList.add('busy');
                blockElement.innerHTML = `<span>${i}</span><span class="busy-mark">X</span>`;
            } else if (block.allocated && block.fileId !== null) {
                // Block allocated to a file
                const file = files[block.fileId];
                blockElement.style.backgroundColor = file.color;
                blockElement.classList.add('allocated');
                blockElement.setAttribute('data-file', file.name);
                
                if (block.isIndex) {
                    blockElement.classList.add('index-block');
                    blockElement.textContent = `I${file.id + 1}`;
                } else {
                    blockElement.textContent = i;
                }
                
                // Add pointers for linked allocation
                if (block.nextBlock !== null) {
                    const pointer = document.createElement('div');
                    pointer.classList.add('pointer');
                    pointer.textContent = '→';
                    blockElement.appendChild(pointer);
                }
            } else {
                // Free block
                blockElement.classList.add('free');
                blockElement.textContent = i;
            }
            
            diskContainer.appendChild(blockElement);
        }

        // Add legend
        const legend = document.createElement('div');
        legend.classList.add('legend');
        
        // Add free block to legend
        const freeItem = document.createElement('div');
        freeItem.classList.add('legend-item');
        freeItem.innerHTML = `
            <div class="legend-color" style="background-color: #eee;"></div>
            <span>Free Block</span>
        `;
        legend.appendChild(freeItem);
        
        // Add busy block to legend
        const busyItem = document.createElement('div');
        busyItem.classList.add('legend-item');
        busyItem.innerHTML = `
            <div class="legend-color" style="background-color: #ff0000;"></div>
            <span>Already Allocated Block</span>
        `;
        legend.appendChild(busyItem);
        
        // Add file blocks to legend
        for (let file of files) {
            const fileItem = document.createElement('div');
            fileItem.classList.add('legend-item');
            fileItem.innerHTML = `
                <div class="legend-color" style="background-color: ${file.color};"></div>
                <span>${file.name}</span>
            `;
            legend.appendChild(fileItem);
        }
        
        // Add index block to legend if needed
        if (allocationMethodSelect.value === 'indexed') {
            const indexItem = document.createElement('div');
            indexItem.classList.add('legend-item');
            indexItem.innerHTML = `
                <div class="legend-color" style="background-color: #f8e0ff; border: 2px dashed #9932cc;"></div>
                <span>Index Block</span>
            `;
            legend.appendChild(indexItem);
        }
        
        diskContainer.appendChild(legend);
    }

    function displayAllocationInfo(method) {
        let html = `<h4>${getMethodFullName(method)} Allocation Details</h4>`;
        
        switch(method) {
            case 'contiguous':
                html += `<p>In contiguous allocation, each file occupies a set of contiguous blocks.</p>`;
                html += `<table class="allocation-table">
                            <tr>
                                <th>File</th>
                                <th>Starting Block</th>
                                <th>Length</th>
                                <th>Ending Block</th>
                            </tr>`;
                
                for (let file of files) {
                    html += `<tr>
                                <td>${file.name}</td>
                                <td>${file.blocks[0]}</td>
                                <td>${file.size}</td>
                                <td>${file.blocks[file.blocks.length - 1]}</td>
                            </tr>`;
                }
                
                html += `</table>`;
                break;
                
            case 'linked':
                html += `<p>In linked allocation, each block contains a pointer to the next block in the file.</p>`;
                html += `<table class="allocation-table">
                            <tr>
                                <th>File</th>
                                <th>Start Block</th>
                                <th>Block Chain</th>
                            </tr>`;
                
                for (let file of files) {
                    let blockChain = '';
                    for (let i = 0; i < file.blocks.length; i++) {
                        blockChain += file.blocks[i];
                        if (i < file.blocks.length - 1) {
                            blockChain += ' → ';
                        }
                    }
                    
                    html += `<tr>
                                <td>${file.name}</td>
                                <td>${file.blocks[0]}</td>
                                <td>${blockChain}</td>
                            </tr>`;
                }
                
                html += `</table>`;
                break;
                
            case 'indexed':
                html += `<p>In indexed allocation, each file has an index block containing pointers to the file's data blocks.</p>`;
                html += `<table class="allocation-table">
                            <tr>
                                <th>File</th>
                                <th>Index Block</th>
                                <th>Data Blocks</th>
                            </tr>`;
                
                for (let file of files) {
                    let dataBlocks = file.blocks.join(', ');
                    
                    html += `<tr>
                                <td>${file.name}</td>
                                <td>${file.indexBlock}</td>
                                <td>${dataBlocks}</td>
                            </tr>`;
                }
                
                html += `</table>`;
                break;

             case 'multilevel':
    html += `<p>Multilevel Indexed Allocation: One main index points to sub-index blocks, which point to data blocks.</p>`;
    html += `<table class="allocation-table">
                <tr><th>File</th><th>Main Index</th><th>Sub Indexes</th><th>Data Blocks</th></tr>`;
    for (let file of files) {
        html += `<tr>
                    <td>${file.name}</td>
                    <td>${file.indexBlock}</td>
                    <td>${file.subIndexes.join(', ')}</td>
                    <td>${file.blocks.join(', ')}</td>
                 </tr>`;
    }
    html += `</table>`;
    break;

        }
        
        allocationInfo.innerHTML = html;
    }

    function getMethodFullName(method) {
        switch(method) {
            case 'contiguous':
                return 'Sequential (Contiguous)';
            case 'linked':
                return 'Linked';
            case 'indexed':
                return 'Indexed';
            default:
                return method;
            case 'multilevel':
                    return 'Multilevel Indexed';
                    
        }
    }

    // Initialize disk blocks when total blocks changes
    totalBlocksInput.addEventListener('change', setupInitialDiskBlocks);
});