document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const menuNameHeader = document.getElementById('menu-name-header');
    const itemsContainer = document.getElementById('menu-items-container');
    const addItemForm = document.getElementById('add-item-form');
    const parentItemIdInput = document.getElementById('parent-item-id');
    const addItemHeader = document.querySelector('#add-item-form').closest('.card').querySelector('h6');

    const urlParams = new URLSearchParams(window.location.search);
    const menuId = urlParams.get('id');

    if (!menuId) {
        menuNameHeader.textContent = "Error: No Menu ID Provided";
        return;
    }

    // --- DATA FETCHING AND RENDERING ---
    
    async function fetchAndRenderMenu() {
        try {
            const response = await fetch(`/api/ussd/menus/${menuId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not load menu data.');
            
            const { menu, items } = await response.json();
            menuNameHeader.textContent = `Editing: ${menu.menu_name}`;
            
            itemsContainer.innerHTML = '';
            const menuTree = buildMenuTree(items);
            itemsContainer.appendChild(renderMenuItems(menuTree));

        } catch (error) {
            itemsContainer.innerHTML = `<p class="text-danger">${error.message}</p>`;
        }
    }

    function buildMenuTree(items, parentId = null) {
        return items
            .filter(item => item.parent_item_id === parentId)
            .map(item => ({ ...item, children: buildMenuTree(items, item.id) }));
    }

    function renderMenuItems(items) {
        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.paddingLeft = '0';

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'menu-item-card';
            li.innerHTML = `
                <div>
                    <strong>Trigger: ${item.option_trigger}</strong> (<span class="font-weight-bold ${item.response_type === 'CON' ? 'text-primary' : 'text-danger'}">${item.response_type}</span>)
                </div>
                <p class="mb-2"><em>${item.response_text.replace(/\n/g, '<br>')}</em></p>
                <div class="mt-2">
                    <button class="btn btn-sm btn-secondary add-child-btn" data-parent-id="${item.id}">Add Child</button>
                    <button class="btn btn-sm btn-info edit-item-btn" data-item-id="${item.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-item-btn" data-item-id="${item.id}">Delete</button>
                </div>
            `;
            
            if (item.children && item.children.length > 0) {
                const childContainer = document.createElement('div');
                childContainer.style.marginLeft = '25px';
                childContainer.style.marginTop = '1rem';
                childContainer.appendChild(renderMenuItems(item.children));
                li.appendChild(childContainer);
            }
            
            ul.appendChild(li);
        });
        return ul;
    }
    
    // --- EVENT HANDLING ---
    
    itemsContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.add-child-btn')) {
            const parentId = target.dataset.parentId;
            prepareAddItemForm(parentId);
        }
        if (target.matches('.delete-item-btn')) {
            const itemId = target.dataset.itemId;
            if (confirm(`Are you sure you want to delete item #${itemId}? This cannot be undone.`)) {
                handleDeleteItem(itemId);
            }
        }
        if (target.matches('.edit-item-btn')) {
            const itemId = target.dataset.itemId;
            // For now, we will use simple prompts to edit.
            // A more advanced UI would use a modal or inline editing.
            handleEditItem(itemId);
        }
    });

    function prepareAddItemForm(parentId) {
        parentItemIdInput.value = parentId;
        addItemHeader.textContent = `Add Child to Item #${parentId}`;
        document.getElementById('option-trigger').focus();
    }

    addItemForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const formData = {
            parent_item_id: parentItemIdInput.value || null,
            option_trigger: document.getElementById('option-trigger').value,
            response_type: document.getElementById('response-type').value,
            response_text: document.getElementById('response-text').value,
        };

        try {
            const response = await fetch(`/api/ussd/menus/${menuId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            alert(result.message);
            addItemForm.reset();
            parentItemIdInput.value = ''; // Reset parent to root
            addItemHeader.textContent = 'Add New Item';
            fetchAndRenderMenu(); // Refresh the menu view
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    async function handleDeleteItem(itemId) {
        try {
            const response = await fetch(`/api/ussd/menus/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
            fetchAndRenderMenu(); // Refresh the menu
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
    
    async function handleEditItem(itemId) {
        // Find the item in our global data to pre-fill the prompts
        const itemToEdit = findItemById(globalAdminData.items, itemId);
        if (!itemToEdit) {
            alert("Could not find item to edit.");
            return;
        }

        const newTrigger = prompt("Enter the new trigger:", itemToEdit.option_trigger);
        const newText = prompt("Enter the new response text:", itemToEdit.response_text);
        
        if (newTrigger && newText) {
            try {
                const response = await fetch(`/api/ussd/menus/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        option_trigger: newTrigger,
                        response_type: itemToEdit.response_type, // Type editing is complex, so we keep it the same for now
                        response_text: newText
                    })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                alert(result.message);
                fetchAndRenderMenu(); // Refresh the menu
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    }

    function findItemById(items, id) {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = findItemById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    // --- INITIAL LOAD ---
    fetchAndRenderMenu();
});