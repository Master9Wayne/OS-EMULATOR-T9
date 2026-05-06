document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeSwitch = document.getElementById('theme-switch');
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeSwitch.checked = true;
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        themeSwitch.checked = false;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-theme');
        themeSwitch.checked = true;
    }
    
    themeSwitch.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Tab Switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and content
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Notification System
    function showNotification(elementId, message, type = 'info') {
        const notification = document.getElementById(elementId);
        notification.querySelector('.notification-message').textContent = message;
        notification.className = 'notification';
        notification.classList.add(type);
        notification.style.display = 'flex';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    // Close notification on click
    document.querySelectorAll('.notification-close').forEach(button => {
        button.addEventListener('click', () => {
            button.parentElement.style.display = 'none';
        });
    });
    
    // Confirmation Dialog
    const confirmationDialog = document.getElementById('confirmation-dialog');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogCancel = document.getElementById('dialog-cancel');
    const dialogConfirm = document.getElementById('dialog-confirm');
    
    function showConfirmDialog(title, message, confirmCallback) {
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        confirmationDialog.classList.add('open');
        
        // Remove previous event listeners
        const newDialogConfirm = dialogConfirm.cloneNode(true);
        dialogConfirm.parentNode.replaceChild(newDialogConfirm, dialogConfirm);
        
        // Add new event listener
        newDialogConfirm.addEventListener('click', () => {
            confirmCallback();
            confirmationDialog.classList.remove('open');
        });
        
        dialogCancel.addEventListener('click', () => {
            confirmationDialog.classList.remove('open');
        });
    }
    
    // Load data from localStorage
    let singleFiles = JSON.parse(localStorage.getItem('singleFiles')) || [];
    let hashedFiles = JSON.parse(localStorage.getItem('hashedFiles')) || Array.from({length: 5}, () => []);
    let indexedFiles = JSON.parse(localStorage.getItem('indexedFiles')) || [];
    let fileSystem = JSON.parse(localStorage.getItem('fileSystem')) || {};
    
    // ==================== Single-Level Directory ====================
    const singleInput = document.getElementById('single-input');
    const singleAddBtn = document.getElementById('single-add-btn');
    const singleDeleteBtn = document.getElementById('single-delete-btn');
    const singleDisplay = document.getElementById('single-display');
    const singleEmpty = document.getElementById('single-empty');
    const singleCount = document.getElementById('single-count');
    
    function updateSingleDisplay() {
        singleDisplay.innerHTML = '';
        
        if (singleFiles.length === 0) {
            singleEmpty.style.display = 'flex';
            singleCount.textContent = '0 files';
        } else {
            singleEmpty.style.display = 'none';
            singleCount.textContent = `${singleFiles.length} file${singleFiles.length !== 1 ? 's' : ''}`;
            
            singleFiles.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <div class="file-icon-large"></div>
                    <div class="file-name">${file}</div>
                    <div class="file-delete" data-file="${file}"></div>
                `;
                singleDisplay.appendChild(fileItem);
            });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('#single-display .file-delete').forEach(button => {
                button.addEventListener('click', (e) => {
                    const fileName = e.target.getAttribute('data-file');
                    showConfirmDialog(
                        'Delete File',
                        `Are you sure you want to delete "${fileName}"?`,
                        () => {
                            singleFiles = singleFiles.filter(f => f !== fileName);
                            localStorage.setItem('singleFiles', JSON.stringify(singleFiles));
                            updateSingleDisplay();
                            showNotification('single-notification', `File "${fileName}" deleted successfully`, 'success');
                        }
                    );
                });
            });
        }
    }
    
    singleAddBtn.addEventListener('click', () => {
        const fileName = singleInput.value.trim();
        
        if (!fileName) {
            showNotification('single-notification', 'Please enter a file name', 'error');
            return;
        }
        
        if (singleFiles.includes(fileName)) {
            showNotification('single-notification', 'A file with this name already exists', 'error');
            return;
        }
        
        singleFiles.push(fileName);
        localStorage.setItem('singleFiles', JSON.stringify(singleFiles));
        singleInput.value = '';
        updateSingleDisplay();
        showNotification('single-notification', `File "${fileName}" added successfully`, 'success');
    });
    
    singleDeleteBtn.addEventListener('click', () => {
        const fileName = singleInput.value.trim();
        
        if (!fileName) {
            showNotification('single-notification', 'Please enter a file name to delete', 'error');
            return;
        }
        
        if (!singleFiles.includes(fileName)) {
            showNotification('single-notification', 'File not found', 'error');
            return;
        }
        
        showConfirmDialog(
            'Delete File',
            `Are you sure you want to delete "${fileName}"?`,
            () => {
                singleFiles = singleFiles.filter(f => f !== fileName);
                localStorage.setItem('singleFiles', JSON.stringify(singleFiles));
                singleInput.value = '';
                updateSingleDisplay();
                showNotification('single-notification', `File "${fileName}" deleted successfully`, 'success');
            }
        );
    });
    
    // Initialize single-level directory
    updateSingleDisplay();
    
    // ==================== Hashed Directory ====================
    const hashedInput = document.getElementById('hashed-input');
    const hashedAddBtn = document.getElementById('hashed-add-btn');
    const hashedDeleteBtn = document.getElementById('hashed-delete-btn');
    const hashedDisplay = document.getElementById('hashed-display');
    const hashInfo = document.getElementById('hash-info');
    const hashValue = document.getElementById('hash-value');
    const hashBucket = document.getElementById('hash-bucket');
    
    const numBuckets = 5;
    
    function hashFunction(fileName) {
        let sum = 0;
        for (let char of fileName) {
            sum += char.charCodeAt(0);
        }
        return sum % numBuckets;
    }
    
    function updateHashedDisplay() {
        hashedDisplay.innerHTML = '';
        
        for (let i = 0; i < numBuckets; i++) {
            const bucket = document.createElement('div');
            bucket.className = 'bucket';
            
            const bucketHeader = document.createElement('div');
            bucketHeader.className = 'bucket-header';
            bucketHeader.textContent = `Bucket ${i}`;
            
            const bucketFiles = document.createElement('div');
            bucketFiles.className = 'bucket-files';
            
            if (hashedFiles[i].length === 0) {
                const emptyBucket = document.createElement('div');
                emptyBucket.className = 'empty-state';
                emptyBucket.style.minHeight = '100px';
                emptyBucket.innerHTML = '<p>Empty bucket</p>';
                bucketFiles.appendChild(emptyBucket);
            } else {
                hashedFiles[i].forEach(file => {
                    const bucketFile = document.createElement('div');
                    bucketFile.className = 'bucket-file';
                    bucketFile.innerHTML = `
                        <div class="bucket-file-icon"></div>
                        <div class="bucket-file-name">${file}</div>
                        <div class="bucket-file-delete" data-file="${file}" data-bucket="${i}"></div>
                    `;
                    bucketFiles.appendChild(bucketFile);
                });
            }
            
            bucket.appendChild(bucketHeader);
            bucket.appendChild(bucketFiles);
            hashedDisplay.appendChild(bucket);
        }
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.bucket-file-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const fileName = e.target.getAttribute('data-file');
                const bucketIndex = parseInt(e.target.getAttribute('data-bucket'));
                
                showConfirmDialog(
                    'Delete File',
                    `Are you sure you want to delete "${fileName}" from bucket ${bucketIndex}?`,
                    () => {
                        hashedFiles[bucketIndex] = hashedFiles[bucketIndex].filter(f => f !== fileName);
                        localStorage.setItem('hashedFiles', JSON.stringify(hashedFiles));
                        updateHashedDisplay();
                        showNotification('hashed-notification', `File "${fileName}" deleted from bucket ${bucketIndex}`, 'success');
                    }
                );
            });
        });
    }
    
    hashedInput.addEventListener('input', () => {
        const fileName = hashedInput.value.trim();
        
        if (fileName) {
            const bucketIndex = hashFunction(fileName);
            hashValue.textContent = hashFunction(fileName);
            hashBucket.textContent = bucketIndex;
            hashInfo.style.visibility = 'visible';
        } else {
            hashInfo.style.visibility = 'hidden';
        }
    });
    
    hashedAddBtn.addEventListener('click', () => {
        const fileName = hashedInput.value.trim();
        
        if (!fileName) {
            showNotification('hashed-notification', 'Please enter a file name', 'error');
            return;
        }
        
        const bucketIndex = hashFunction(fileName);
        
        if (hashedFiles[bucketIndex].includes(fileName)) {
            showNotification('hashed-notification', 'A file with this name already exists in this bucket', 'error');
            return;
        }
        
        hashedFiles[bucketIndex].push(fileName);
        localStorage.setItem('hashedFiles', JSON.stringify(hashedFiles));
        hashedInput.value = '';
        hashInfo.style.visibility = 'hidden';
        updateHashedDisplay();
        showNotification('hashed-notification', `File "${fileName}" added to bucket ${bucketIndex}`, 'success');
    });
    
    hashedDeleteBtn.addEventListener('click', () => {
        const fileName = hashedInput.value.trim();
        
        if (!fileName) {
            showNotification('hashed-notification', 'Please enter a file name to delete', 'error');
            return;
        }
        
        const bucketIndex = hashFunction(fileName);
        
        if (!hashedFiles[bucketIndex].includes(fileName)) {
            showNotification('hashed-notification', 'File not found in the bucket', 'error');
            return;
        }
        
        showConfirmDialog(
            'Delete File',
            `Are you sure you want to delete "${fileName}" from bucket ${bucketIndex}?`,
            () => {
                hashedFiles[bucketIndex] = hashedFiles[bucketIndex].filter(f => f !== fileName);
                localStorage.setItem('hashedFiles', JSON.stringify(hashedFiles));
                hashedInput.value = '';
                hashInfo.style.visibility = 'hidden';
                updateHashedDisplay();
                showNotification('hashed-notification', `File "${fileName}" deleted from bucket ${bucketIndex}`, 'success');
            }
        );
    });
    
    // Initialize hashed directory
    updateHashedDisplay();
    
    // ==================== Indexed Directory ====================
    const indexedInput = document.getElementById('indexed-input');
    const indexedAddBtn = document.getElementById('indexed-add-btn');
    const indexedDeleteBtn = document.getElementById('indexed-delete-btn');
    const indexedDisplay = document.getElementById('indexed-display');
    const indexedEmpty = document.getElementById('indexed-empty');
    const indexedSearch = document.getElementById('indexed-search');
    
    function updateIndexedDisplay(searchTerm = '') {
        const tbody = indexedDisplay.querySelector('tbody');
        tbody.innerHTML = '';
        
        const filteredFiles = searchTerm 
            ? indexedFiles.filter(file => 
                file !== null && 
                (file.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                file.index.toString().includes(searchTerm))
            )
            : indexedFiles.filter(file => file !== null);
        
        if (filteredFiles.length === 0) {
            indexedEmpty.style.display = 'flex';
            tbody.style.display = 'none';
        } else {
            indexedEmpty.style.display = 'none';
            tbody.style.display = 'table-row-group';
            
            filteredFiles.forEach(file => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${file.index}</td>
                    <td>
                        <span class="table-file-icon"></span>
                        ${file.name}
                    </td>
                    <td style="text-align: right;">
                        <span class="table-delete" data-index="${file.index}"></span>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.table-delete').forEach(button => {
                button.addEventListener('click', (e) => {
                    const fileIndex = parseInt(e.target.getAttribute('data-index'));
                    const file = indexedFiles.find(f => f !== null && f.index === fileIndex);
                    
                    if (file) {
                        showConfirmDialog(
                            'Delete File',
                            `Are you sure you want to delete "${file.name}" with index ${file.index}?`,
                            () => {
                                const fileIndex = indexedFiles.findIndex(f => f !== null && f.index === file.index);
                                indexedFiles[fileIndex] = null;
                                localStorage.setItem('indexedFiles', JSON.stringify(indexedFiles));
                                updateIndexedDisplay(indexedSearch.value);
                                showNotification('indexed-notification', `File "${file.name}" deleted successfully`, 'success');
                            }
                        );
                    }
                });
            });
        }
    }
    
    indexedAddBtn.addEventListener('click', () => {
        const fileName = indexedInput.value.trim();
        
        if (!fileName) {
            showNotification('indexed-notification', 'Please enter a file name', 'error');
            return;
        }
        
        if (indexedFiles.some(file => file !== null && file.name === fileName)) {
            showNotification('indexed-notification', 'A file with this name already exists', 'error');
            return;
        }
        
        // Find the next available index
        const maxIndex = indexedFiles.length > 0 
            ? Math.max(...indexedFiles.filter(f => f !== null).map(f => f.index), -1) 
            : -1;
        const newIndex = maxIndex + 1;
        
        indexedFiles.push({ index: newIndex, name: fileName });
        localStorage.setItem('indexedFiles', JSON.stringify(indexedFiles));
        indexedInput.value = '';
        updateIndexedDisplay(indexedSearch.value);
        showNotification('indexed-notification', `File "${fileName}" added with index ${newIndex}`, 'success');
    });
    
    indexedDeleteBtn.addEventListener('click', () => {
        const fileName = indexedInput.value.trim();
        
        if (!fileName) {
            showNotification('indexed-notification', 'Please enter a file name to delete', 'error');
            return;
        }
        
        const file = indexedFiles.find(f => f !== null && f.name === fileName);
        
        if (!file) {
            showNotification('indexed-notification', 'File not found', 'error');
            return;
        }
        
        showConfirmDialog(
            'Delete File',
            `Are you sure you want to delete "${file.name}" with index ${file.index}?`,
            () => {
                const fileIndex = indexedFiles.findIndex(f => f !== null && f.name === fileName);
                indexedFiles[fileIndex] = null;
                localStorage.setItem('indexedFiles', JSON.stringify(indexedFiles));
                indexedInput.value = '';
                updateIndexedDisplay(indexedSearch.value);
                showNotification('indexed-notification', `File "${file.name}" deleted successfully`, 'success');
            }
        );
    });
    
    indexedSearch.addEventListener('input', () => {
        updateIndexedDisplay(indexedSearch.value);
    });
    
    // Initialize indexed directory
    updateIndexedDisplay();
    
    // ==================== Hierarchical Directory ====================
    const hierarchicalInput = document.getElementById('hierarchical-input');
    const hierarchicalFileBtn = document.getElementById('hierarchical-file-btn');
    const hierarchicalFolderBtn = document.getElementById('hierarchical-folder-btn');
    const hierarchicalDeleteBtn = document.getElementById('hierarchical-delete-btn');
    const hierarchicalEmpty = document.getElementById('hierarchical-empty');
    const treeRoot = document.getElementById('tree-root');
    
    function traverse(root, components, create = false) {
        let current = root;
        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            if (current[component] && typeof current[component] === 'object') {
                current = current[component];
            } else if (create) {
                current[component] = {};
                current = current[component];
            } else {
                return null;
            }
        }
        return current;
    }
    
    function getOrCreateParent(path) {
        const components = path.split('/').filter(c => c);
        if (components.length < 1) {
            return null;
        }
        const parentComponents = components.slice(0, -1);
        const name = components[components.length - 1];
        const parent = traverse(fileSystem, parentComponents, true);
        return {parent, name};
    }
    
    function getParentAndName(path) {
        const components = path.split('/').filter(c => c);
        if (components.length < 1) {
            return null;
        }
        const parentComponents = components.slice(0, -1);
        const name = components[components.length - 1];
        const parent = traverse(fileSystem, parentComponents, false);
        if (parent) {
            return {parent, name};
        } else {
            return null;
        }
    }
    
    function renderFileSystem() {
        treeRoot.innerHTML = '';
        
        if (Object.keys(fileSystem).length === 0) {
            hierarchicalEmpty.style.display = 'flex';
            treeRoot.style.display = 'none';
        } else {
            hierarchicalEmpty.style.display = 'none';
            treeRoot.style.display = 'block';
            renderTree(fileSystem, treeRoot, '');
        }
    }
    
    function renderTree(node, parentElement, path) {
        for (const [name, value] of Object.entries(node)) {
            const isFolder = value !== null;
            const itemPath = path ? `${path}/${name}` : name;
            
            const li = document.createElement('li');
            li.className = 'tree-item';
            
            const row = document.createElement('div');
            row.className = 'tree-row';
            
            if (isFolder) {
                row.innerHTML = `
                    <div class="tree-toggle" data-path="${itemPath}"></div>
                    <div class="tree-icon tree-folder" data-path="${itemPath}"></div>
                    <div class="tree-label">${name}</div>
                    <div class="tree-delete" data-path="${itemPath}"></div>
                `;
                
                const childrenContainer = document.createElement('ul');
                childrenContainer.className = 'tree-children';
                childrenContainer.setAttribute('data-path', itemPath);
                
                li.appendChild(row);
                li.appendChild(childrenContainer);
                
                // Add event listener to toggle folder
                row.querySelector('.tree-toggle').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const path = e.target.getAttribute('data-path');
                    const childrenContainer = document.querySelector(`.tree-children[data-path="${path}"]`);
                    const toggleIcon = e.target;
                    const folderIcon = row.querySelector('.tree-folder');
                    
                    if (childrenContainer.classList.contains('open')) {
                        childrenContainer.classList.remove('open');
                        toggleIcon.classList.remove('open');
                        folderIcon.classList.remove('open');
                    } else {
                        childrenContainer.classList.add('open');
                        toggleIcon.classList.add('open');
                        folderIcon.classList.add('open');
                        
                        // Render children if not already rendered
                        if (childrenContainer.children.length === 0) {
                            renderTree(value, childrenContainer, itemPath);
                        }
                    }
                });
                
                // Add click event to folder icon and label
                row.querySelector('.tree-folder').addEventListener('click', (e) => {
                    e.target.previousElementSibling.click(); // Click the toggle
                });
                
                row.querySelector('.tree-label').addEventListener('click', (e) => {
                    e.target.previousElementSibling.previousElementSibling.click(); // Click the toggle
                });
            } else {
                row.innerHTML = `
                    <div class="tree-toggle" style="visibility: hidden;"></div>
                    <div class="tree-icon tree-file"></div>
                    <div class="tree-label">${name}</div>
                    <div class="tree-delete" data-path="${itemPath}"></div>
                `;
                li.appendChild(row);
            }
            
            // Add event listener to delete button
            row.querySelector('.tree-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                const path = e.target.getAttribute('data-path');
                const result = getParentAndName(path);
                
                if (result) {
                    const { parent, name } = result;
                    const isFolder = parent[name] !== null;
                    
                    showConfirmDialog(
                        'Delete Item',
                        `Are you sure you want to delete "${name}"${isFolder ? ' and all its contents' : ''}?`,
                        () => {
                            delete parent[name];
                            localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
                            renderFileSystem();
                            showNotification('hierarchical-notification', `"${name}" deleted successfully`, 'success');
                        }
                    );
                }
            });
            
            parentElement.appendChild(li);
        }
    }
    
    hierarchicalFileBtn.addEventListener('click', () => {
        const path = hierarchicalInput.value.trim();
        
        if (!path) {
            showNotification('hierarchical-notification', 'Please enter a valid path', 'error');
            return;
        }
        
        const result = getOrCreateParent(path);
        
        if (!result) {
            showNotification('hierarchical-notification', 'Invalid path', 'error');
            return;
        }
        
        const { parent, name } = result;
        
        if (parent[name] !== undefined) {
            showNotification('hierarchical-notification', `An item with the name "${name}" already exists at this location`, 'error');
            return;
        }
        
        parent[name] = null; // null represents a file
        localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
        hierarchicalInput.value = '';
        renderFileSystem();
        showNotification('hierarchical-notification', `File "${name}" added successfully`, 'success');
    });
    
    hierarchicalFolderBtn.addEventListener('click', () => {
        const path = hierarchicalInput.value.trim();
        
        if (!path) {
            showNotification('hierarchical-notification', 'Please enter a valid path', 'error');
            return;
        }
        
        const result = getOrCreateParent(path);
        
        if (!result) {
            showNotification('hierarchical-notification', 'Invalid path', 'error');
            return;
        }
        
        const { parent, name } = result;
        
        if (parent[name] !== undefined) {
            showNotification('hierarchical-notification', `An item with the name "${name}" already exists at this location`, 'error');
            return;
        }
        
        parent[name] = {}; // Empty object represents a folder
        localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
        hierarchicalInput.value = '';
        renderFileSystem();
        showNotification('hierarchical-notification', `Folder "${name}" added successfully`, 'success');
    });
    
    hierarchicalDeleteBtn.addEventListener('click', () => {
        const path = hierarchicalInput.value.trim();
        
        if (!path) {
            showNotification('hierarchical-notification', 'Please enter a valid path', 'error');
            return;
        }
        
        const result = getParentAndName(path);
        
        if (!result) {
            showNotification('hierarchical-notification', 'Path not found', 'error');
            return;
        }
        
        const { parent, name } = result;
        
        if (parent[name] === undefined) {
            showNotification('hierarchical-notification', 'Item not found', 'error');
            return;
        }
        
        const isFolder = parent[name] !== null;
        
        showConfirmDialog(
            'Delete Item',
            `Are you sure you want to delete "${name}"${isFolder ? ' and all its contents' : ''}?`,
            () => {
                delete parent[name];
                localStorage.setItem('fileSystem', JSON.stringify(fileSystem));
                hierarchicalInput.value = '';
                renderFileSystem();
                showNotification('hierarchical-notification', `"${name}" deleted successfully`, 'success');
            }
        );
    });
    
    // Initialize hierarchical directory
    renderFileSystem();
    
    // Info tooltips
    document.querySelectorAll('.info-tooltip').forEach(tooltip => {
        const content = tooltip.querySelector('.tooltip-content');
        
        // Position the tooltip content
        tooltip.addEventListener('mouseenter', () => {
            const rect = tooltip.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();
            
            // Check if tooltip would go off-screen to the right
            if (rect.left + contentRect.width / 2 > window.innerWidth) {
                content.style.left = 'auto';
                content.style.right = '0';
                content.style.transform = 'translateX(0)';
            }
            // Check if tooltip would go off-screen to the left
            else if (rect.left - contentRect.width / 2 < 0) {
                content.style.left = '0';
                content.style.right = 'auto';
                content.style.transform = 'translateX(0)';
            }
            // Center the tooltip
            else {
                content.style.left = '50%';
                content.style.right = 'auto';
                content.style.transform = 'translateX(-50%)';
            }
        });
    });
});