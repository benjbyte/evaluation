const innovamedMembers = ['Benj', 'Diana', 'Gelo', 'Glenn', 'Jason', 'Jian', 'Kat', 'Noreen', 'Romeo', 'Romy', 'Zea'];
const allianceMembers = ['Andrea', 'Charese', 'Darius', 'Dolores', 'Keith', 'King', 'Luis','Ramon', 'Romelee', 'Wendy'];
/** */
function createRow(name) {
    const imageName = name.toLowerCase() + '.jpg';
    const imagePath = `assets/images/${imageName}`;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${name}</td>
         <td><img src="${imagePath}" class="thumbnail" onclick="showModal(this.src)" onerror="this.src='assets/images/placeholder.png'"></td>
        <td><input type="number" min="0" max="20" step="0.1" class="score-input" placeholder="0-20" 
            onchange="validateInput(this, 20)" data-criterion="Creativity"></td>
        <td><input type="number" min="0" max="20" step="0.1" class="score-input" placeholder="0-20" 
            onchange="validateInput(this, 20)" data-criterion="DIY/Resourcefulness"></td>
        <td><input type="number" min="0" max="20" step="0.1" class="score-input" placeholder="0-20" 
            onchange="validateInput(this, 20)" data-criterion="Effort"></td>
        <td><input type="number" min="0" max="10" step="0.1" class="score-input" placeholder="0-10" 
            onchange="validateInput(this, 10)" data-criterion="Originality"></td>
        <td><input type="number" min="0" max="10" step="0.1" class="score-input" placeholder="0-10" 
            onchange="validateInput(this, 10)" data-criterion="Presentation"></td>
        <td><input type="number" min="0" max="10" step="0.1" class="score-input" placeholder="0-10" 
            onchange="validateInput(this, 10)" data-criterion="Authenticity"></td>
        <td><input type="number" min="0" max="10" step="0.1" class="score-input" placeholder="0-10" 
            onchange="validateInput(this, 10)" data-criterion="Overall look"></td>
        <td class="total">0</td>
    `;
    return row;
}


function validateInput(input, maxValue) {
    let value = parseFloat(input.value);
    const criterion = input.dataset.criterion;

    // Check if value is a number
    if (isNaN(value)) {
        value = 0;
    }

    // Ensure value is not negative
    if (value < 0) {
        value = 0;
        showNotification(`${criterion} score cannot be negative`);
    }

    // Ensure value doesn't exceed maximum
    if (value > maxValue) {
        value = maxValue;
        showNotification(`${criterion} score cannot exceed ${maxValue}`);
    }

    // Round to 1 decimal place
    value = Math.round(value * 10) / 10;

    // Update input value
    input.value = value;

    // Calculate total
    calculateTotal(input);
}

function showNotification(message) {
    // Create notification container if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    // Show notification
    notification.textContent = message;
    notification.classList.add('show');

    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function populateTable() {
    const innovamedTbody = document.getElementById('innovamed-tbody');
    const allianceTbody = document.getElementById('alliance-tbody');

    innovamedMembers.forEach(name => {
        innovamedTbody.appendChild(createRow(name));
    });

    allianceMembers.forEach(name => {
        allianceTbody.appendChild(createRow(name));
    });
}

function calculateTotal(input) {
    const row = input.closest('tr');
    const inputs = row.querySelectorAll('input');
    let total = 0;
    inputs.forEach(input => {
        total += Number(input.value || 0);
    });
    row.querySelector('.total').textContent = total;
}

function showModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modal.style.display = "block";
    modalImg.src = src;
}

function closeModal() {
    document.getElementById('imageModal').style.display = "none";
}

// Initialize tables
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tables
    populateTable();
});


async function submitScores() {
    const evaluatorInput = document.getElementById('evaluatorName');
    const evaluatorName = evaluatorInput.value.trim();
    
    if (!evaluatorName) {
        evaluatorInput.parentElement.classList.add('is-invalid', 'shake');
        evaluatorInput.parentElement.addEventListener('animationend', () => {
            evaluatorInput.parentElement.classList.remove('shake');
        });
        
        await showNotification('Please enter evaluator name', true);
        evaluatorInput.focus();
        return;
    }

    // Remove invalid state if previously set
    evaluatorInput.parentElement.classList.remove('is-invalid');

    // Check if any scores are entered
    let hasScores = false;
    const allInputs = document.querySelectorAll('input[type="number"]');
    allInputs.forEach(input => {
        if (input.value.trim() !== '') {
            hasScores = true;
        }
    });

    if (!hasScores) {
        showNotification('Please enter at least one score before submitting', true);
        return;
    }

    // Collect all scores
    let scoresText = `Evaluator: ${evaluatorName}\n--Entries--\n`;
    let entryNumber = 1;

    // Process Innovamed scores
    const innovamedRows = document.getElementById('innovamed-tbody').getElementsByTagName('tr');
    for (let row of innovamedRows) {
        scoresText += formatRowData(row, entryNumber++);
    }

    // Process Alliance scores
    const allianceRows = document.getElementById('alliance-tbody').getElementsByTagName('tr');
    for (let row of allianceRows) {
        scoresText += formatRowData(row, entryNumber++);
    }

    // Prepare the payload
    const payload = {
        text: scoresText,
        thread: {
            threadKey: "THREAD_KEY_VALUE"
        }
    };

    try {
        const response = await sendToWebhook(payload);
        if (response.ok) {
            await showNotification('Scores submitted successfully!');
            resetForm(false);
        } else {
            await showNotification('Error submitting scores. Please try again.', true);
        }
    } catch (error) {
        console.error('Error:', error);
        await showNotification('Error submitting scores. Please try again.', true);
    }
}

function formatRowData(row, index) {
    const name = row.cells[0].textContent;
    const inputs = row.querySelectorAll('input[type="number"]');
    const total = row.querySelector('.total').textContent;
    let scores = Array.from(inputs).map(input => input.value || '0').join(' | ');
    return `${index}. ${name} | ${scores} | total: ${total}\n`;
}

async function sendToWebhook(payload) {
    const webhookUrl = 'https://chat.googleapis.com/v1/spaces/AAAAC2FXHW4/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=BZlsPMO-Nqc4_IlfHPfN8pNo63O4mGx9BcbdYq6_XkY'; // Replace with your webhook URL
    
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify(payload)
    });
    
    return response;
}

// Update the existing showNotification function to handle success/error states
// function showNotification(message, isError = false) {
//     let notification = document.getElementById('notification');
//     if (!notification) {
//         notification = document.createElement('div');
//         notification.id = 'notification';
//         document.body.appendChild(notification);
//     }

//     notification.textContent = message;
//     notification.className = isError ? 'show error' : 'show success';
    
//     setTimeout(() => {
//         notification.classList.remove('show', 'error', 'success');
//     }, 3000);
// }


// Replace the showNotification function with this new version
function showNotification(message, isError = false) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('notificationDialog');
        const messageEl = document.getElementById('notificationMessage');
        const okButton = document.getElementById('notificationOk');

        // Set message
        messageEl.textContent = message;

        // Set state class
        dialog.classList.remove('success', 'error');
        dialog.classList.add(isError ? 'error' : 'success');

        // Show the dialog
        dialog.showModal();

        // Handle OK button
        const handleClose = () => {
            dialog.close();
            okButton.removeEventListener('click', handleClose);
            resolve();
        };

        okButton.addEventListener('click', handleClose);

        // Handle click outside (optional)
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) {
                handleClose();
            }
        });
    });
}

// Add this at the start of your JavaScript
let dialogConfirmed = false;

// Update the resetForm function to accept a parameter for skipping confirmation
async function resetForm(askConfirmation = true) {
    if (askConfirmation) {
        const confirmed = await showConfirmDialog();
        if (!confirmed) return;
    }

    // Reset evaluator name
    const evaluatorInput = document.getElementById('evaluatorName');
    evaluatorInput.value = '';
    
    // Reset MDL input state (to handle floating label)
    evaluatorInput.parentElement.classList.remove('is-dirty');

    // Reset all score inputs
    const tables = ['innovamed-tbody', 'alliance-tbody'];
    tables.forEach(tableId => {
        const tbody = document.getElementById(tableId);
        const rows = tbody.getElementsByTagName('tr');
        
        for (let row of rows) {
            // Reset all number inputs
            const inputs = row.querySelectorAll('input[type="number"]');
            inputs.forEach(input => {
                input.value = '';
                // Add flash effect
                input.parentElement.classList.add('reset-flash');
                setTimeout(() => {
                    input.parentElement.classList.remove('reset-flash');
                }, 1000);
            });

            // Reset total
            const totalCell = row.querySelector('.total');
            totalCell.textContent = '0';
        }
    });

    // Only show notification if it's a manual reset
    if (askConfirmation) {
        showNotification('All scores have been reset');
    }
}

// Add these new functions
function showConfirmDialog() {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmDialog');
        const confirmButton = document.getElementById('confirmReset');
        const cancelButton = document.getElementById('cancelReset');

        // Show the dialog
        dialog.showModal();

        // Handle confirm button
        confirmButton.onclick = () => {
            dialog.close();
            resolve(true);
        };

        // Handle cancel button
        cancelButton.onclick = () => {
            dialog.close();
            resolve(false);
        };

        // Handle click outside dialog
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) {
                dialog.close();
                resolve(false);
            }
        });
    });
}

// Optional: Add escape key handling
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const dialog = document.getElementById('confirmDialog');
        if (dialog.open) {
            dialog.close();
        }
    }

    const evaluatorInput = document.getElementById('evaluatorName');
    
    evaluatorInput.addEventListener('input', function() {
        if (this.value.trim()) {
            this.parentElement.classList.remove('is-invalid');
        }
    });

    evaluatorInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            this.parentElement.classList.add('is-invalid');
        }
    });
});