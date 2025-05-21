document.addEventListener('DOMContentLoaded', function() {
    const newTicketTab = document.querySelector('a[href="#new-ticket"]');
    const myTicketTab = document.querySelector('a[href="#my-tickets"]');
    const newTicketSection = document.getElementById('new-ticket');
    const myTicketsSection = document.getElementById('my-tickets');
    const ticketForm = document.getElementById('ticketForm');
    const openTicketsList = document.getElementById('openTicketsList');
    const inProgressTicketsList = document.getElementById('inProgressTicketsList');
    const closedTicketsList = document.getElementById('closedTicketsList');

    const API_BASE = '';
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // Hide New Ticket tab and section for non-customers
    if (window.localStorage.getItem('role') !== 'customer') {
        newTicketTab.style.display = 'none';
        newTicketSection.style.display = 'none';
        myTicketTab.classList.add('text-gray-900');
        myTicketTab.classList.remove('text-gray-500');
    }

    // Tab switching functionality
    newTicketTab.addEventListener('click', (e) => {
        e.preventDefault();
        newTicketSection.classList.remove('hidden');
        myTicketsSection.classList.add('hidden');
        newTicketTab.classList.add('text-gray-900');
        newTicketTab.classList.remove('text-gray-500');
        myTicketTab.classList.add('text-gray-500');
        myTicketTab.classList.remove('text-gray-900');
    });

    myTicketTab.addEventListener('click', (e) => {
        e.preventDefault();
        newTicketSection.classList.add('hidden');
        myTicketsSection.classList.remove('hidden');
        myTicketTab.classList.add('text-gray-900');
        myTicketTab.classList.remove('text-gray-500');
        newTicketTab.classList.add('text-gray-500');
        newTicketTab.classList.remove('text-gray-900');
        loadTickets();
    });

    // Form submission handler
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const subject = ticketForm.subject.value.trim();
        const category = ticketForm.category.value;
        const priority = ticketForm.priority.value;
        const description = ticketForm.description.value.trim();

        if (!subject || !description) {
            showNotification('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subject, category, priority, description })
            });
            const data = await res.json();
            if (res.ok) {
                showNotification('Ticket submitted successfully!', 'success');
                ticketForm.reset();
                myTicketTab.click();
            } else {
                showNotification(data.error || 'Failed to submit ticket.', 'error');
            }
        } catch (error) {
            showNotification('Network error. Please try again.', 'error');
        }
    });

    // Load and display tickets
    async function loadTickets() {
        try {
            const res = await fetch(`${API_BASE}/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tickets = await res.json();
            if (!res.ok) {
                showNotification(tickets.error || 'Failed to load tickets.', 'error');
                return;
            }

            // Clear all lists
            openTicketsList.innerHTML = '';
            inProgressTicketsList.innerHTML = '';
            closedTicketsList.innerHTML = '';

            // Filter tickets by status
            const openTickets = tickets.filter(ticket => ticket.status === 'New' || ticket.status === 'Open');
            const inProgressTickets = tickets.filter(ticket => ticket.status === 'In Progress');
            const closedTickets = tickets.filter(ticket => ticket.status === 'Closed');

            // Helper to generate ticket HTML
            function generateTicketHtml(ticket) {
                const priorityClass =
                    ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                    ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800';

                const assignedTo = ticket.assignedTo ? ticket.assignedTo : 'Unassigned';

                // Buttons for employees/admins to assign, reassign and close tickets
                let actionButtons = '';
                const currentUser = window.localStorage.getItem('username');
                const userRole = window.localStorage.getItem('role');
                
                if (userRole === 'employee' || userRole === 'admin') {
                    if (ticket.assignedTo && ticket.assignedTo.toLowerCase() === currentUser.toLowerCase()) {
                        actionButtons = `
                            <button data-id="${ticket.id}" data-action="close" class="close-btn bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Close Ticket</button>
                        `;
                    } else if (!ticket.assignedTo) {
                        actionButtons = `
                            <button data-id="${ticket.id}" data-action="assign" class="assign-btn bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Assign to Me</button>
                        `;
                    }
                    
                    // Add reassignment dropdown for admins
                    if (userRole === 'admin' && ticket.assignedTo) {
                        actionButtons += `
                            <div class="inline-block relative ml-2">
                                <select data-id="${ticket.id}" class="reassign-select bg-white border border-gray-300 rounded px-3 py-1 appearance-none">
                                    <option value="">Reassign...</option>
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        `;
                    }
                }

                return `
                    <div class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow mb-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="text-lg font-medium text-gray-900">${escapeHtml(ticket.subject)}</h3>
                                <p class="mt-1 text-sm text-gray-500">Ticket #${ticket.id}</p>
                                <p class="mt-1 text-sm text-gray-700">Created by: <strong>${escapeHtml(ticket.username)}</strong></p>
                                <p class="mt-1 text-sm text-gray-700">Assigned to: <strong>${escapeHtml(assignedTo)}</strong></p>
                            </div>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityClass}">
                                ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                            </span>
                        </div>
                        <div class="mt-2">
                            <p class="text-sm text-gray-600 whitespace-pre-line">${escapeHtml(ticket.description)}</p>
                        </div>
                        <div class="mt-4">
                            <h4 class="font-semibold mb-2">Comments:</h4>
                            <div class="comments-list mb-4" id="comments-${ticket.id}">
                                ${ticket.comments && ticket.comments.length > 0 ? ticket.comments.map(comment => `
                                    <div class="mb-2 p-2 bg-gray-100 rounded">
                                        <p class="text-sm"><strong>${escapeHtml(comment.author)}</strong> <em>${new Date(comment.timestamp).toLocaleString()}</em></p>
                                        <p class="text-sm">${escapeHtml(comment.text)}</p>
                                    </div>
                                `).join('') : '<p class="text-sm text-gray-500">No comments yet.</p>'}
                            </div>
                            ${ (window.localStorage.getItem('role') === 'employee' && ticket.assignedTo === window.localStorage.getItem('username')) || window.localStorage.getItem('role') === 'admin' ? `
                            <form class="comment-form" data-id="${ticket.id}">
                                <textarea name="comment" rows="2" class="w-full p-2 border border-gray-300 rounded mb-2" placeholder="Add a comment..." required></textarea>
                                <button type="submit" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Add Comment</button>
                            </form>
                            ` : ''}
                        </div>
                        <div class="mt-4 flex justify-between items-center">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ${ticket.status}
                            </span>
                            <span class="text-sm text-gray-500">
                                ${new Date(ticket.createdAt).toLocaleString()}
                            </span>
                            <div>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;
            }

            // Render tickets in their respective sections
            openTicketsList.innerHTML = openTickets.map(generateTicketHtml).join('') || '<p class="text-gray-500">No open tickets</p>';
            inProgressTicketsList.innerHTML = inProgressTickets.map(generateTicketHtml).join('') || '<p class="text-gray-500">No in progress tickets</p>';
            closedTicketsList.innerHTML = closedTickets.map(generateTicketHtml).join('') || '<p class="text-gray-500">No closed tickets</p>';

            // Add event listeners for assign and close buttons
            document.querySelectorAll('.assign-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const ticketId = e.target.getAttribute('data-id');
                    try {
                        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ 
                              assignedTo: localStorage.getItem('username'), 
                              status: 'In Progress',
                              comment: `Ticket assigned to ${localStorage.getItem('username')}`
                            })
                        });
                        if (res.ok) {
                            showNotification('Ticket assigned to you.', 'success');
                            loadTickets();
                        } else {
                            const data = await res.json();
                            showNotification(data.error || 'Failed to assign ticket.', 'error');
                        }
                    } catch (error) {
                        showNotification('Network error. Please try again.', 'error');
                    }
                });
            });

            document.querySelectorAll('.close-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const ticketId = e.target.getAttribute('data-id');
                    try {
                        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: 'Closed' })
                        });
                        if (res.ok) {
                            showNotification('Ticket closed.', 'success');
                            loadTickets();
                        } else {
                            const data = await res.json();
                            showNotification(data.error || 'Failed to close ticket.', 'error');
                        }
                    } catch (error) {
                        showNotification('Network error. Please try again.', 'error');
                    }
                });
            });

            // Add event listeners for reassignment dropdowns
            document.querySelectorAll('.reassign-select').forEach(select => {
                // Fetch employees and populate dropdown
                fetchEmployees().then(employees => {
                    employees.forEach(employee => {
                        const option = document.createElement('option');
                        option.value = employee.username;
                        option.textContent = employee.username;
                        select.appendChild(option);
                    });
                });

                select.addEventListener('change', async (e) => {
                    const ticketId = e.target.getAttribute('data-id');
                    const newAssignee = e.target.value;
                    if (!newAssignee) return;

                    try {
                        const res = await fetch(`${API_BASE}/tickets/${ticketId}/reassign`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ 
                                assignedTo: newAssignee,
                                comment: `Ticket reassigned to ${newAssignee} by admin`
                            })
                        });
                        if (res.ok) {
                            showNotification('Ticket reassigned successfully.', 'success');
                            loadTickets();
                        } else {
                            const data = await res.json();
                            showNotification(data.error || 'Failed to reassign ticket.', 'error');
                        }
                    } catch (error) {
                        showNotification('Network error. Please try again.', 'error');
                    }
                    e.target.value = ''; // Reset dropdown
                });
            });

        } catch (error) {
            showNotification('Network error. Please try again.', 'error');
        }
    }

    // Notification helper
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } transition-opacity duration-500`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Fetch list of employees for reassignment
    async function fetchEmployees() {
        try {
            const res = await fetch(`${API_BASE}/employees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                return data;
            } else {
                showNotification(data.error || 'Failed to fetch employees.', 'error');
                return [];
            }
        } catch (error) {
            showNotification('Network error. Please try again.', 'error');
            return [];
        }
    }

    // Helper function to escape HTML and prevent XSS
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    }

    // Initialize the form state
    function resetFormState() {
        const categorySelect = document.getElementById('category');
        const prioritySelect = document.getElementById('priority');

        if (categorySelect) categorySelect.value = 'general';
        if (prioritySelect) prioritySelect.value = 'low';
    }

    // Reset form state when switching to New Ticket tab
    newTicketTab.addEventListener('click', resetFormState);

    // Initial form state setup
    resetFormState();
});
