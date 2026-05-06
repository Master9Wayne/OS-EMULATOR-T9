let simulationState = {
    'producer-consumer': {
        running: false,
        buffer: [],
        producers: [],
        consumers: [],
        mutexLock: false,
        fullSemaphore: 0,
        emptySemaphore: 0
    },
    'readers-writers': {
        running: false,
        readers: [],
        writers: [],
        readCount: 0,
        writeCount: 0,
        mutex: false,
        resourceMutex: false,
        readMutex: false,
        writeMutex: false,
        waitingReaders: [],
        waitingWriters: [],
        queue: []
    },
    'dining-philosophers': {
        running: false,
        philosophers: [],
        forks: [],
        mutex: false
    }
};

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function addLogEntry(problemId, message, type = 'info') {
    const logContainer = document.getElementById(`${problemId}-log`);
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
    });
});

// Producer Consumer
function initProducerConsumerUI() {
    const bufferSize = parseInt(document.getElementById('pc-buffer-size').value);
    const producerCount = parseInt(document.getElementById('pc-producers').value);
    const consumerCount = parseInt(document.getElementById('pc-consumers').value);
    const bufferContainer = document.getElementById('pc-buffer');
    bufferContainer.innerHTML = '';
    for (let i = 0; i < bufferSize; i++) {
        const bufferItem = document.createElement('div');
        bufferItem.className = 'buffer-item';
        bufferItem.id = `buffer-item-${i}`;
        bufferItem.textContent = '';
        bufferContainer.appendChild(bufferItem);
    }
    const producersContainer = document.getElementById('pc-producers-container');
    producersContainer.innerHTML = '';
    for (let i = 0; i < producerCount; i++) {
        const producer = document.createElement('div');
        producer.className = 'agent producer';
        producer.id = `producer-${i}`;
        producer.textContent = `P${i}`;
        producer.setAttribute('data-status', 'idle');
        producersContainer.appendChild(producer);
    }
    const consumersContainer = document.getElementById('pc-consumers-container');
    consumersContainer.innerHTML = '';
    for (let i = 0; i < consumerCount; i++) {
        const consumer = document.createElement('div');
        consumer.className = 'agent consumer';
        consumer.id = `consumer-${i}`;
        consumer.textContent = `C${i}`;
        consumer.setAttribute('data-status', 'idle');
        consumersContainer.appendChild(consumer);
    }
    document.getElementById('pc-log').innerHTML = '';
    addLogEntry('pc', 'Producer-Consumer simulation initialized', 'info');
}

function resetProducerConsumer() {
    const state = simulationState['producer-consumer'];
    state.running = false;
    state.buffer = [];
    state.producers = [];
    state.consumers = [];
    state.mutexLock = false;
    const bufferSize = parseInt(document.getElementById('pc-buffer-size').value);
    state.emptySemaphore = bufferSize;
    state.fullSemaphore = 0;
    initProducerConsumerUI();
    document.getElementById('pc-start').disabled = false;
    document.getElementById('pc-stop').disabled = true;
    addLogEntry('pc', 'Simulation reset', 'info');
}

async function producer(id, state) {
    const producerEl = document.getElementById(`producer-${id}`);
    const minTime = parseInt(document.getElementById('pc-prod-min-time').value);
    const maxTime = parseInt(document.getElementById('pc-prod-max-time').value);
    while (state.running) {
        producerEl.setAttribute('data-status', 'thinking');
        const thinkTime = randomBetween(minTime, maxTime);
        addLogEntry('pc', `Producer ${id} is thinking for ${thinkTime}ms`, 'info');
        await sleep(thinkTime);
        if (!state.running) break;
        producerEl.setAttribute('data-status', 'waiting for empty');
        addLogEntry('pc', `Producer ${id} is waiting for an empty slot`, 'warning');
        while (state.emptySemaphore <= 0 && state.running) {
            await sleep(100);
        }
        if (!state.running) break;
        state.emptySemaphore--;
        producerEl.setAttribute('data-status', 'waiting for mutex');
        addLogEntry('pc', `Producer ${id} is waiting for mutex`, 'warning');
        while (state.mutexLock && state.running) {
            await sleep(100);
        }
        if (!state.running) break;
        state.mutexLock = true;
        producerEl.setAttribute('data-status', 'producing');
        producerEl.classList.add('active-agent');
        const item = Math.floor(Math.random() * 100);
        addLogEntry('pc', `Producer ${id} is producing item: ${item}`, 'success');
        state.buffer.push(item);
        for (let i = 0; i < state.buffer.length; i++) {
            const bufferItem = document.getElementById(`buffer-item-${i}`);
            bufferItem.textContent = state.buffer[i];
            bufferItem.classList.add('full');
        }
        await sleep(500); 
        producerEl.classList.remove('active-agent');
        state.mutexLock = false;
        state.fullSemaphore++;
        producerEl.setAttribute('data-status', 'idle');
    }
    producerEl.setAttribute('data-status', 'stopped');
    addLogEntry('pc', `Producer ${id} has stopped`, 'info');
}

async function consumer(id, state) {
    const consumerEl = document.getElementById(`consumer-${id}`);
    const minTime = parseInt(document.getElementById('pc-cons-min-time').value);
    const maxTime = parseInt(document.getElementById('pc-cons-max-time').value);
    while (state.running) {
        consumerEl.setAttribute('data-status', 'thinking');
        const thinkTime = randomBetween(minTime, maxTime);
        addLogEntry('pc', `Consumer ${id} is thinking for ${thinkTime}ms`, 'info');
        await sleep(thinkTime);
        if (!state.running) break;
        consumerEl.setAttribute('data-status', 'waiting for item');
        addLogEntry('pc', `Consumer ${id} is waiting for an item`, 'warning');
        while (state.fullSemaphore <= 0 && state.running) {
            await sleep(100);
        }
        
        if (!state.running) break;
        
        state.fullSemaphore--;

        consumerEl.setAttribute('data-status', 'waiting for mutex');
        addLogEntry('pc', `Consumer ${id} is waiting for mutex`, 'warning');

        while (state.mutexLock && state.running) {
            await sleep(100);
        }
        
        if (!state.running) break;
        
        state.mutexLock = true;

        consumerEl.setAttribute('data-status', 'consuming');
        consumerEl.classList.add('active-agent');

        const item = state.buffer.shift();
        addLogEntry('pc', `Consumer ${id} is consuming item: ${item}`, 'success');

        for (let i = 0; i < state.buffer.length; i++) {
            const bufferItem = document.getElementById(`buffer-item-${i}`);
            bufferItem.textContent = state.buffer[i];
            bufferItem.classList.add('full');
        }

        for (let i = state.buffer.length; i < parseInt(document.getElementById('pc-buffer-size').value); i++) {
            const bufferItem = document.getElementById(`buffer-item-${i}`);
            bufferItem.textContent = '';
            bufferItem.classList.remove('full');
        }
        
        await sleep(500); 
        
        consumerEl.classList.remove('active-agent');

        state.mutexLock = false;
   
        state.emptySemaphore++;
   
        consumerEl.setAttribute('data-status', 'idle');
    }
    
    consumerEl.setAttribute('data-status', 'stopped');
    addLogEntry('pc', `Consumer ${id} has stopped`, 'info');
}

async function startProducerConsumer() {
    const state = simulationState['producer-consumer'];
    
    if (state.running) return;
    
    state.running = true;
    state.buffer = [];
    state.producers = [];
    state.consumers = [];
    state.mutexLock = false;
    
    const bufferSize = parseInt(document.getElementById('pc-buffer-size').value);
    state.emptySemaphore = bufferSize;
    state.fullSemaphore = 0;
    
    document.getElementById('pc-start').disabled = true;
    document.getElementById('pc-stop').disabled = false;
    
    initProducerConsumerUI();
    addLogEntry('pc', 'Starting Producer-Consumer simulation', 'success');
    

    const producerCount = parseInt(document.getElementById('pc-producers').value);
    for (let i = 0; i < producerCount; i++) {
        producer(i, state);
    }
    

    const consumerCount = parseInt(document.getElementById('pc-consumers').value);
    for (let i = 0; i < consumerCount; i++) {
        consumer(i, state);
    }
}


function stopProducerConsumer() {
    const state = simulationState['producer-consumer'];
    
    state.running = false;
    document.getElementById('pc-start').disabled = false;
    document.getElementById('pc-stop').disabled = true;
    
    addLogEntry('pc', 'Stopping simulation...', 'warning');
}

document.getElementById('pc-start').addEventListener('click', startProducerConsumer);
document.getElementById('pc-stop').addEventListener('click', stopProducerConsumer);
document.getElementById('pc-reset').addEventListener('click', resetProducerConsumer);

function initReadersWritersUI() {
    const readerCount = parseInt(document.getElementById('rw-readers').value);
    const writerCount = parseInt(document.getElementById('rw-writers').value);
    
    const resource = document.getElementById('rw-resource');
    resource.className = 'resource';
    resource.querySelector('.resource-status').textContent = 'Not in use';
    resource.querySelector('.resource-counter').textContent = 'Readers: 0';
    
    const readersContainer = document.getElementById('rw-readers-container');
    readersContainer.innerHTML = '';
    
    for (let i = 0; i < readerCount; i++) {
        const reader = document.createElement('div');
        reader.className = 'agent reader';
        reader.id = `reader-${i}`;
        reader.textContent = `R${i}`;
        reader.setAttribute('data-status', 'idle');
        readersContainer.appendChild(reader);
    }
    
    const writersContainer = document.getElementById('rw-writers-container');
    writersContainer.innerHTML = '';
    
    for (let i = 0; i < writerCount; i++) {
        const writer = document.createElement('div');
        writer.className = 'agent writer';
        writer.id = `writer-${i}`;
        writer.textContent = `W${i}`;
        writer.setAttribute('data-status', 'idle');
        writersContainer.appendChild(writer);
    }
    
    document.getElementById('rw-log').innerHTML = '';
    addLogEntry('rw', 'Readers-Writers simulation initialized', 'info');
}

function resetReadersWriters() {
    const state = simulationState['readers-writers'];
    
    state.running = false;
    state.readers = [];
    state.writers = [];
    state.readCount = 0;
    state.writeCount = 0;
    state.mutex = false;
    state.resourceMutex = false;
    state.readMutex = false;
    state.writeMutex = false;
    state.waitingReaders = [];
    state.waitingWriters = [];
    state.queue = [];
    
    initReadersWritersUI();
    
    document.getElementById('rw-start').disabled = false;
    document.getElementById('rw-stop').disabled = true;
    
    addLogEntry('rw', 'Simulation reset', 'info');
}

async function reader(id, state) {
    const readerEl = document.getElementById(`reader-${id}`);
    const minTime = parseInt(document.getElementById('rw-read-min-time').value);
    const maxTime = parseInt(document.getElementById('rw-read-max-time').value);
    const priority = document.getElementById('rw-priority').value;
    
    while (state.running) {
        
        readerEl.setAttribute('data-status', 'thinking');
        const thinkTime = randomBetween(minTime, maxTime);
        addLogEntry('rw', `Reader ${id} is thinking for ${thinkTime}ms`, 'info');
        await sleep(thinkTime);
        
        if (!state.running) break;
        readerEl.setAttribute('data-status', 'waiting');
        readerEl.classList.add('waiting-agent');
        addLogEntry('rw', `Reader ${id} wants to read`, 'warning');
        
       
        if (priority === 'fair') {
            state.queue.push({ type: 'reader', id });
            while (state.queue[0].type !== 'reader' || state.queue[0].id !== id) {
                await sleep(100);
                if (!state.running) break;
            }
            if (!state.running) break;
        }
        
        
        if (priority === 'writers') {
            while ((state.writeMutex || state.writeCount > 0) && state.running) {
                await sleep(100);
            }
        } else {
            while (state.writeCount > 0 && state.running) {
                await sleep(100);
            }
        }
        
        if (!state.running) break;
        

        while (state.readMutex && state.running) {
            await sleep(100);
        }
        
        if (!state.running) break;
        
        state.readMutex = true;
        

        state.readCount++;
        
 
        if (state.readCount === 1) {
     
            while (state.resourceMutex && state.running) {
                await sleep(100);
            }
            
            if (!state.running) {
                state.readMutex = false;
                break;
            }
            
            state.resourceMutex = true;
            
            const resource = document.getElementById('rw-resource');
            resource.classList.add('reading');
            resource.querySelector('.resource-status').textContent = 'Reading';
        }
        
        state.readMutex = false;
        
        if (priority === 'fair') {
            state.queue.shift(); 
        }
        
        readerEl.setAttribute('data-status', 'reading');
        readerEl.classList.remove('waiting-agent');
        readerEl.classList.add('active-agent');
        
        
        document.querySelector('#rw-resource .resource-counter').textContent = `Readers: ${state.readCount}`;
        
        addLogEntry('rw', `Reader ${id} is reading`, 'success');
        
       
        const readTime = randomBetween(minTime, maxTime);
        await sleep(readTime);
        
        readerEl.classList.remove('active-agent');
        
        if (!state.running) break;
        
        while (state.readMutex && state.running) {
            await sleep(100);
        }
        
        if (!state.running) break;
        
        state.readMutex = true;
        
        state.readCount--;

        document.querySelector('#rw-resource .resource-counter').textContent = `Readers: ${state.readCount}`;
      
        if (state.readCount === 0) {

            state.resourceMutex = false;
            
            const resource = document.getElementById('rw-resource');
            resource.classList.remove('reading');
            resource.querySelector('.resource-status').textContent = 'Not in use';
        }
        
        state.readMutex = false;
        
        readerEl.setAttribute('data-status', 'idle');
        addLogEntry('rw', `Reader ${id} finished reading`, 'info');
    }
    
    readerEl.setAttribute('data-status', 'stopped');
    readerEl.classList.remove('waiting-agent', 'active-agent');
    addLogEntry('rw', `Reader ${id} has stopped`, 'info');
}

async function writer(id, state) {
    const writerEl = document.getElementById(`writer-${id}`);
    const minTime = parseInt(document.getElementById('rw-write-min-time').value);
    const maxTime = parseInt(document.getElementById('rw-write-max-time').value);
    const priority = document.getElementById('rw-priority').value;
    
    while (state.running) {
        writerEl.setAttribute('data-status', 'thinking');
        const thinkTime = randomBetween(minTime, maxTime);
        addLogEntry('rw', `Writer ${id} is thinking for ${thinkTime}ms`, 'info');
        await sleep(thinkTime);
        
        if (!state.running) break;
        
        writerEl.setAttribute('data-status', 'waiting');
        writerEl.classList.add('waiting-agent');
        addLogEntry('rw', `Writer ${id} wants to write`, 'warning');
        
        if (priority === 'fair') {
            state.queue.push({ type: 'writer', id });
            while (state.queue[0].type !== 'writer' || state.queue[0].id !== id) {
                await sleep(100);
                if (!state.running) break;
            }
            if (!state.running) break;
        }
        
        if (priority === 'writers') {
 
            while (state.writeMutex && state.running) {
                await sleep(100);
            }
            if (!state.running) break;
            state.writeMutex = true;
        }

        while (state.resourceMutex && state.running) {
            await sleep(100);
        }
        
        if (!state.running) {
            if (priority === 'writers') {
                state.writeMutex = false;
            }
            break;
        }
        
        state.resourceMutex = true;
        state.writeCount++;
        
        if (priority === 'fair') {
            state.queue.shift(); 
        }

        writerEl.setAttribute('data-status', 'writing');
        writerEl.classList.remove('waiting-agent');
        writerEl.classList.add('active-agent');

        const resource = document.getElementById('rw-resource');
        resource.classList.add('writing');
        resource.querySelector('.resource-status').textContent = 'Writing';
        
        addLogEntry('rw', `Writer ${id} is writing`, 'success');

        const writeTime = randomBetween(minTime, maxTime);
        await sleep(writeTime);
        
        writerEl.classList.remove('active-agent');
        
        if (!state.running) break;
        state.writeCount--;

        resource.classList.remove('writing');
        resource.querySelector('.resource-status').textContent = 'Not in use';

        state.resourceMutex = false;

        if (priority === 'writers') {
            state.writeMutex = false;
        }
        
        writerEl.setAttribute('data-status', 'idle');
        addLogEntry('rw', `Writer ${id} finished writing`, 'info');
    }
    
    writerEl.setAttribute('data-status', 'stopped');
    writerEl.classList.remove('waiting-agent', 'active-agent');
    addLogEntry('rw', `Writer ${id} has stopped`, 'info');
}

async function startReadersWriters() {
    const state = simulationState['readers-writers'];
    
    if (state.running) return;
    
    state.running = true;
    state.readers = [];
    state.writers = [];
    state.readCount = 0;
    state.writeCount = 0;
    state.mutex = false;
    state.resourceMutex = false;
    state.readMutex = false;
    state.writeMutex = false;
    state.waitingReaders = [];
    state.waitingWriters = [];
    state.queue = [];
    
    document.getElementById('rw-start').disabled = true;
    document.getElementById('rw-stop').disabled = false;
    
    initReadersWritersUI();
    addLogEntry('rw', 'Starting Readers-Writers simulation', 'success');
        const readerCount = parseInt(document.getElementById('rw-readers').value);
    for (let i = 0; i < readerCount; i++) {
        reader(i, state);
    }
    
    const writerCount = parseInt(document.getElementById('rw-writers').value);
    for (let i = 0; i < writerCount; i++) {
        writer(i, state);
    }
}

function stopReadersWriters() {
    const state = simulationState['readers-writers'];
    
    state.running = false;
    document.getElementById('rw-start').disabled = false;
    document.getElementById('rw-stop').disabled = true;
    
    addLogEntry('rw', 'Stopping simulation...', 'warning');
}

document.getElementById('rw-start').addEventListener('click', startReadersWriters);
document.getElementById('rw-stop').addEventListener('click', stopReadersWriters);
document.getElementById('rw-reset').addEventListener('click', resetReadersWriters);

function initDiningPhilosophersUI() {
    const philosopherCount = parseInt(document.getElementById('dp-philosophers').value);
    
    const tableContainer = document.getElementById('dp-table');
    tableContainer.innerHTML = '<div class="table-center">Table</div>';
    
    for (let i = 0; i < philosopherCount; i++) {
        
        const angle = (i * (360 / philosopherCount)) * (Math.PI / 180);
        const radius = 120; 
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        
        const philosopherSeat = document.createElement('div');
        philosopherSeat.className = 'philosopher-seat';
        philosopherSeat.id = `philosopher-${i}`;
        philosopherSeat.textContent = `P${i}`;
        philosopherSeat.style.left = `calc(50% + ${x}px)`;
        philosopherSeat.style.top = `calc(50% + ${y}px)`;
        tableContainer.appendChild(philosopherSeat);
        
        
        const forkAngle = ((i + 0.5) * (360 / philosopherCount)) * (Math.PI / 180);
        const forkX = Math.cos(forkAngle) * (radius - 40);
        const forkY = Math.sin(forkAngle) * (radius - 40);
        
        const fork = document.createElement('div');
        fork.className = 'fork-item';
        fork.id = `fork-${i}`;
        fork.style.left = `calc(50% + ${forkX}px)`;
        fork.style.top = `calc(50% + ${forkY}px)`;
        fork.style.transform = `translate(-50%, -50%) rotate(${forkAngle + Math.PI/2}rad)`;
        tableContainer.appendChild(fork);
    }
    
   
    const statusContainer = document.getElementById('dp-status-container');
    statusContainer.innerHTML = '';
    
    for (let i = 0; i < philosopherCount; i++) {
        const status = document.createElement('div');
        status.className = 'philosopher-status';
        status.innerHTML = `<span>P${i}: </span><span id="status-${i}">Thinking</span>`;
        statusContainer.appendChild(status);
    }
    
  
    document.getElementById('dp-log').innerHTML = '';
    
    addLogEntry('dp', 'Dining Philosophers simulation initialized', 'info');
}

function resetDiningPhilosophers() {
    const state = simulationState['dining-philosophers'];
    
    state.running = false;
    state.philosophers = [];
    state.forks = [];
    state.mutex = false;
    
    initDiningPhilosophersUI();
    
    document.getElementById('dp-start').disabled = false;
    document.getElementById('dp-stop').disabled = true;
    
    addLogEntry('dp', 'Simulation reset', 'info');
}

async function philosopher(id, state) {
    const philosopherEl = document.getElementById(`philosopher-${id}`);
    const statusEl = document.getElementById(`status-${id}`);
    const philosopherCount = parseInt(document.getElementById('dp-philosophers').value);
    const strategy = document.getElementById('dp-strategy').value;
    
    const thinkMinTime = parseInt(document.getElementById('dp-think-min-time').value);
    const thinkMaxTime = parseInt(document.getElementById('dp-think-max-time').value);
    const eatMinTime = parseInt(document.getElementById('dp-eat-min-time').value);
    const eatMaxTime = parseInt(document.getElementById('dp-eat-max-time').value);

    let leftFork, rightFork;
    
    if (strategy === 'asymmetric') {
       
        if (id % 2 === 0) {
            leftFork = id;
            rightFork = (id + 1) % philosopherCount;
        } else {
            leftFork = (id + 1) % philosopherCount;
            rightFork = id;
        }
    } else {
        
        leftFork = id;
        rightFork = (id + 1) % philosopherCount;
    }
    
    while (state.running) {
        philosopherEl.className = 'philosopher-seat thinking';
        statusEl.textContent = 'Thinking';
        
        const thinkTime = randomBetween(thinkMinTime, thinkMaxTime);
        addLogEntry('dp', `Philosopher ${id} is thinking for ${thinkTime}ms`, 'info');
        await sleep(thinkTime);
        
        if (!state.running) break;
        
        philosopherEl.className = 'philosopher-seat waiting';
        statusEl.textContent = 'Hungry';
        addLogEntry('dp', `Philosopher ${id} is hungry and wants to eat`, 'warning');
        
        if (strategy === 'arbitrator') {
            while (state.mutex && state.running) {
                await sleep(100);
            }
            
            if (!state.running) break;
            
            state.mutex = true;
            
            
            const lowerFork = Math.min(leftFork, rightFork);
            const higherFork = Math.max(leftFork, rightFork);
            
            
            await takeFork(lowerFork, id, state);
            await sleep(200); 
            
          
            await takeFork(higherFork, id, state);
            
         
            state.mutex = false;
        } else if (strategy === 'asymmetric') {
            await takeFork(leftFork, id, state);
            await sleep(200);
            
            if (!state.running) {
                await releaseFork(leftFork, state);
                break;
            }
            

            if (await tryTakeFork(rightFork, id, state)) {
                
            } else {
               
                await releaseFork(leftFork, state);
                continue;
            }
        } else if (strategy === 'chandy-misra') {

            if (await tryTakeBothForks(leftFork, rightFork, id, state)) {
            } else {
                await sleep(randomBetween(100, 500));
                continue;
            }
        }
        
        if (!state.running) {
            await releaseFork(leftFork, state);
            await releaseFork(rightFork, state);
            break;
        }
    
        philosopherEl.className = 'philosopher-seat eating';
        statusEl.textContent = 'Eating';
        addLogEntry('dp', `Philosopher ${id} is eating`, 'success');
        
        const eatTime = randomBetween(eatMinTime, eatMaxTime);
        await sleep(eatTime);
        await releaseFork(leftFork, state);
        await sleep(200); 
        await releaseFork(rightFork, state);
        
        addLogEntry('dp', `Philosopher ${id} finished eating`, 'info');
    }
    
    philosopherEl.className = 'philosopher-seat';
    statusEl.textContent = 'Stopped';
    addLogEntry('dp', `Philosopher ${id} has stopped`, 'info');
}

async function takeFork(forkId, philosopherId, state) {
    const fork = document.getElementById(`fork-${forkId}`);
    while (state.forks[forkId] !== undefined && state.running) {
        await sleep(100);
    }
    if (!state.running) return false;
    state.forks[forkId] = philosopherId;
    fork.classList.add('used');
    addLogEntry('dp', `Philosopher ${philosopherId} took fork ${forkId}`, 'info');
    return true;
}

async function tryTakeFork(forkId, philosopherId, state) {
    const fork = document.getElementById(`fork-${forkId}`);
    if (state.forks[forkId] !== undefined) {
        return false;
    }
    state.forks[forkId] = philosopherId;
    fork.classList.add('used');  
    addLogEntry('dp', `Philosopher ${philosopherId} took fork ${forkId}`, 'info');
    return true;
}

async function tryTakeBothForks(leftFork, rightFork, philosopherId, state) {
    if (state.forks[leftFork] !== undefined || state.forks[rightFork] !== undefined) {
        return false;
    }
    state.forks[leftFork] = philosopherId;
    document.getElementById(`fork-${leftFork}`).classList.add('used');
    
    await sleep(200); 
    
    state.forks[rightFork] = philosopherId;
    document.getElementById(`fork-${rightFork}`).classList.add('used');
    
    addLogEntry('dp', `Philosopher ${philosopherId} took both forks`, 'info');
    return true;
}

async function releaseFork(forkId, state) {
    const fork = document.getElementById(`fork-${forkId}`);
    
    if (state.forks[forkId] !== undefined) {
        const philosopherId = state.forks[forkId];
        delete state.forks[forkId];
        fork.classList.remove('used');
        
        addLogEntry('dp', `Philosopher ${philosopherId} released fork ${forkId}`, 'info');
    }
}

async function startDiningPhilosophers() {
    const state = simulationState['dining-philosophers'];
    if (state.running) return;
    state.running = true;
    state.philosophers = [];
    state.forks = [];
    state.mutex = false;
    document.getElementById('dp-start').disabled = true;
    document.getElementById('dp-stop').disabled = false;
    initDiningPhilosophersUI();
    addLogEntry('dp', 'Starting Dining Philosophers simulation', 'success');
    const philosopherCount = parseInt(document.getElementById('dp-philosophers').value);
    for (let i = 0; i < philosopherCount; i++) {
        philosopher(i, state);
    }
}

function stopDiningPhilosophers() {
    const state = simulationState['dining-philosophers'];
    
    state.running = false;
    document.getElementById('dp-start').disabled = false;
    document.getElementById('dp-stop').disabled = true;
    
    addLogEntry('dp', 'Stopping simulation...', 'warning');
}

document.getElementById('dp-start').addEventListener('click', startDiningPhilosophers);
document.getElementById('dp-stop').addEventListener('click', stopDiningPhilosophers);
document.getElementById('dp-reset').addEventListener('click', resetDiningPhilosophers);
document.addEventListener('DOMContentLoaded', function() {
    resetProducerConsumer();
    resetReadersWriters();
    resetDiningPhilosophers();
    document.querySelector('.tab[data-tab="producer-consumer"]').click();
});

document.querySelectorAll('input[type="range"]').forEach(input => {
    const valueDisplay = document.getElementById(`${input.id}-value`);
    if (valueDisplay) {
        valueDisplay.textContent = input.value;
        input.addEventListener('input', () => {
            valueDisplay.textContent = input.value;
        });
    }
});

function applyPreset(problemId, presetConfig) {
    Object.keys(presetConfig).forEach(key => {
        const element = document.getElementById(`${problemId}-${key}`);
        if (element) {
            element.value = presetConfig[key];
            
            if (element.type === 'range') {
                const event = new Event('input');
                element.dispatchEvent(event);
            }
        }
    });
}

const presets = {
    'producer-consumer': {
        'high-contention': {
            'buffer-size': 3,
            'producers': 5,
            'consumers': 5,
            'prod-min-time': 500,
            'prod-max-time': 1500,
            'cons-min-time': 500,
            'cons-max-time': 1500
        },
        'low-contention': {
            'buffer-size': 10,
            'producers': 2,
            'consumers': 2,
            'prod-min-time': 2000,
            'prod-max-time': 5000,
            'cons-min-time': 2000,
            'cons-max-time': 5000
        }
    },
    'readers-writers': {
        'reader-priority': {
            'readers': 7,
            'writers': 3,
            'read-min-time': 500,
            'read-max-time': 1500,
            'write-min-time': 1000,
            'write-max-time': 3000,
            'priority': 'readers'
        },
        'writer-priority': {
            'readers': 7,
            'writers': 3,
            'read-min-time': 500,
            'read-max-time': 1500,
            'write-min-time': 1000,
            'write-max-time': 3000,
            'priority': 'writers'
        }
    },
    'dining-philosophers': {
        'deadlock-prone': {
            'philosophers': 5,
            'think-min-time': 1000,
            'think-max-time': 3000,
            'eat-min-time': 1000,
            'eat-max-time': 3000,
            'strategy': 'naive'
        },
        'deadlock-free': {
            'philosophers': 5,
            'think-min-time': 1000,
            'think-max-time': 3000,
            'eat-min-time': 1000,
            'eat-max-time': 3000,
            'strategy': 'asymmetric'
        }
    }
};

document.querySelectorAll('.preset-button').forEach(button => {
    button.addEventListener('click', () => {
        const problemId = button.getAttribute('data-problem');
        const presetName = button.getAttribute('data-preset');
        
        if (presets[problemId] && presets[problemId][presetName]) {
            applyPreset(problemId, presets[problemId][presetName]);
        }
    });
});

document.querySelectorAll('.export-log').forEach(button => {
    button.addEventListener('click', () => {
        const problemId = button.getAttribute('data-problem');
        const logContainer = document.getElementById(`${problemId}-log`);
        
        if (logContainer) {
            const logText = Array.from(logContainer.children)
                .map(entry => entry.textContent)
                .join('\n');
            
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${problemId}-simulation-log.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });
});

function adjustForScreenSize() {
    const smallScreen = window.innerWidth < 768;
    
    const tables = document.querySelectorAll('.dp-table');
    tables.forEach(table => {
        if (smallScreen) {
            table.style.transform = 'scale(0.7)';
        } else {
            table.style.transform = 'scale(1)';
        }
    });
    
    const logs = document.querySelectorAll('.log-container');
    logs.forEach(log => {
        if (smallScreen) {
            log.style.maxHeight = '150px';
        } else {
            log.style.maxHeight = '300px';
        }
    });
}

window.addEventListener('resize', adjustForScreenSize);
adjustForScreenSize();
