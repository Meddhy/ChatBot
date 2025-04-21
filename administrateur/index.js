document.addEventListener('DOMContentLoaded', function () {
    // Éléments du DOM
    const treeMenu = document.getElementById('tree-menu');
    const addModal = document.getElementById('addModal');
    const editModal = document.getElementById('editModal');
    const addForm = document.getElementById('addForm');
    const editForm = document.getElementById('editForm');
    const closeBtns = document.querySelectorAll('.close');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById("clearSearch");

    // Clé pour le stockage local de l'état d'expansion
    const STORAGE_KEY = 'treeExpansionState';

    // Variables pour optimisation des performances
    let allTreeData = [];
    let debounceTimeout = null;
    let expandedNodes = loadExpansionState() || {};

    // Fermer les modales
    closeBtns.forEach(btn => {
        btn.onclick = function () {
            closeModal(btn.closest('.modal').id);
        }
    });

    // Gérer l'événement de clic sur le bouton "Annuler" pour fermer la modale
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', function() {
            // Récupérer l'ID de la modale à fermer
            const modalId = this.getAttribute('data-modal');
            // Appeler la fonction pour fermer la modale et réinitialiser le formulaire
            closeModal(modalId);
        });
    });

    // Fonction pour fermer la modale et réinitialiser le formulaire
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Cacher la modale en mettant son style à 'none'
            modal.style.display = 'none';

            // Si la modale fermée est 'addModal' ou 'editModal', réinitialiser les champs du formulaire
            if (modalId === 'addModal' || modalId === 'editModal') {
                const form = modal.querySelector('form');
                form.reset(); // Réinitialiser tous les champs du formulaire
            }
        }
    }

    // Masquer la croix au chargement de la page
    clearSearch.style.display = "none";

    // Recherche en temps réel avec debounce pour performances
    searchInput.addEventListener("input", function (e) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 200); // Attendre 200ms après la dernière frappe
    });

    // Fonction de recherche optimisée
    function performSearch(value) {
        const searchTerm = value.toLowerCase();

        // Afficher ou masquer la croix selon le contenu de l'input
        clearSearch.style.display = searchTerm ? "inline-block" : "none";

        // Récupérer tous les éléments une seule fois pour optimiser
        const treeItems = document.querySelectorAll(".tree-item");
        const matchedItemIds = new Set();

        // Première passe: identifier les éléments qui correspondent
        treeItems.forEach((item) => {
            const questionText = item.querySelector(".item-text").textContent.toLowerCase();
            if (questionText.includes(searchTerm)) {
                matchedItemIds.add(item.getAttribute('data-id'));

                // Trouver tous les parents
                let parent = item.parentElement.closest(".tree-item");
                while (parent) {
                    matchedItemIds.add(parent.getAttribute('data-id'));
                    parent = parent.parentElement.closest(".tree-item");
                }
            }
        });

        // Deuxième passe: afficher/masquer
        treeItems.forEach((item) => {
            const shouldShow = searchTerm === '' || matchedItemIds.has(item.getAttribute('data-id'));
            item.style.display = shouldShow ? "block" : "none";
        });
    }

    // Bouton de suppression
    clearSearch.addEventListener("click", function () {
        searchInput.value = ""; // Vide l'input
        searchInput.focus(); // Remet le focus
        clearSearch.style.display = "none"; // Masque la croix
        performSearch(""); // Réaffiche tous les éléments avec la fonction optimisée
    });

    // Charger les données avec mise en cache
    function loadData() {
        $.ajax({
            url: 'admin.php',
            method: 'GET',
            data: {action: 'list'},
            dataType: 'json',
            success: function (data) {
                treeMenu.innerHTML = '';
                const hierarchy = buildHierarchy(data);
                renderTree(hierarchy, treeMenu);
                updateCategorySelects(data);
            },
            error: function (xhr, status, error) {
                console.error('Erreur:', error);
                showNotification('Erreur lors du chargement des données', 'error');
            }
        });
    }

    // Construire la hiérarchie
    function buildHierarchy(data) {
        const map = new Map();
        const roots = [];

        // Créer tous les nœuds
        data.forEach(item => {
            item.children = [];
            map.set(item.id, item);
        });

        // Établir les relations
        data.forEach(item => {
            if (item.categorie === '0' || !map.has(parseInt(item.categorie))) {
                roots.push(item);
            } else {
                const parent = map.get(parseInt(item.categorie));
                parent.children.push(item);
            }
        });

        return roots;
    }

    // Rendre l'arborescence avec support pour l'état d'expansion sauvegardé
    function renderTree(items, container, level = 0) {
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tree-item' + (level > 0 ? ' nested' : '');
            itemDiv.setAttribute('data-id', item.id);

            const header = document.createElement('div');
            header.className = 'tree-item-header';

            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedNodes[item.id] === true;

            header.innerHTML = `
            <span class="toggle-icon">
                ${hasChildren ? `<i class="fas fa-caret-${isExpanded ? 'down' : 'right'}"></i>` : ''}
            </span>
            <span class="item-text">${item.question}</span>
            <div class="item-actions">
                <button class="btn btn-add" onclick="event.stopPropagation(); showAddModal(${item.id})" title="Ajouter une sous-question">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-edit" onclick="event.stopPropagation(); showEditModal(${item.id})" title="Modifier">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-delete" onclick="event.stopPropagation(); deleteItem(${item.id})" title="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            childrenContainer.style.display = isExpanded ? 'block' : 'none';

            if (hasChildren) {
                renderTree(item.children, childrenContainer, level + 1);
            }

            // Gestion du clic
            header.addEventListener('click', function (e) {
                if (!e.target.closest('.item-actions')) {
                    if (hasChildren) {
                        const icon = this.querySelector('.toggle-icon i');
                        icon.classList.toggle('fa-caret-right');
                        icon.classList.toggle('fa-caret-down');
                        const newState = childrenContainer.style.display === 'none' ? 'block' : 'none';
                        childrenContainer.style.display = newState;

                        // Sauvegarder l'état d'expansion
                        expandedNodes[item.id] = (newState === 'block');
                        saveExpansionState();
                    }

                    // Afficher les détails
                    showItemDetails(item);

                    // Gérer l'état actif
                    document.querySelectorAll('.tree-item-header.active').forEach(el => {
                        el.classList.remove('active');
                    });
                    header.classList.add('active');
                }
            });

            itemDiv.appendChild(header);
            itemDiv.appendChild(childrenContainer);
            container.appendChild(itemDiv);
        });
    }

    // Sauvegarder l'état d'expansion dans localStorage
    function saveExpansionState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedNodes));
    }

    // Charger l'état d'expansion depuis localStorage
    function loadExpansionState() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    }

    // Afficher les détails d'un élément
    function showItemDetails(item) {
        const detailsContainer = document.getElementById('current-item-details');
        detailsContainer.innerHTML = `
            <div class="item-details">
                <h3>${item.question}</h3>
                <div class="details-content">
                    <p>${item.reponse}</p>
                </div>
            </div>
        `;
    }

    // Mettre à jour les selects de catégories
    function updateCategorySelects(data) {
        const selects = [
            document.getElementById('categorie'),
            document.getElementById('editCategorie')
        ];

        selects.forEach(select => {
            select.innerHTML = '<option value="0">Question principale</option>';
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.question;
                select.appendChild(option);
            });
        });
    }


    // Afficher le modal d'ajout
    window.showAddModal = function (parentId = 0) {
        document.getElementById('categorie').value = parentId;
        addModal.style.display = 'block';
    }

    // Afficher le modal d'édition
    window.showEditModal = function (id) {
        $.ajax({
            url: 'admin.php',
            method: 'GET',
            data: {
                action: 'get',
                id: id
            },
            dataType: 'json',
            success: function (data) {
                document.getElementById('editId').value = data.id;
                document.getElementById('editQuestion').value = data.question;
                document.getElementById('editCategorie').value = data.categorie;
                document.getElementById('editReponse').value = data.reponse;
                editModal.style.display = 'block';
            },
            error: function (xhr, status, error) {
                console.error('Erreur:', error);
                showNotification('Erreur lors du chargement des données', 'error');
            }
        });
    }

    // Supprimer un élément
    window.deleteItem = function (id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
            $.ajax({
                url: 'admin.php',
                method: 'GET',
                data: {
                    action: 'delete',
                    id: id
                },
                dataType: 'json',
                success: function (data) {
                    if (data.success) {
                        loadData();
                        showNotification('Question supprimée avec succès', 'success');
                    } else {
                        showNotification(data.error || 'Erreur lors de la suppression', 'error');
                    }
                },
                error: function (xhr, status, error) {
                    console.error('Erreur:', error);
                    showNotification('Erreur lors de la suppression', 'error');
                }
            });
        }
    }

    // Gérer l'ajout
    addForm.onsubmit = function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        formData.append('action', 'add');

        fetch('admin.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    closeModal('addModal');
                    addForm.reset();
                    loadData();
                    showNotification('Question ajoutée avec succès', 'success');
                } else {
                    showNotification(data.error || 'Erreur lors de l\'ajout', 'error');
                }
            })
            .catch(error => {
                console.error('Erreur:', error);
                showNotification('Erreur lors de l\'ajout', 'error');
            });
    }

    // Gérer la modification
    editForm.onsubmit = function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        formData.append('action', 'edit');

        $.ajax({
            url: 'admin.php',
            method: 'POST',
            data: Object.fromEntries(formData),
            success: function (data) {
                if (data.success) {
                    closeModal('editModal');
                    loadData();
                    showNotification('Question modifiée avec succès', 'success');
                } else {
                    showNotification(data.error || 'Erreur lors de la modification', 'error');
                }
            },
            error: function (xhr, status, error) {
                console.error('Erreur:', error);
                showNotification('Erreur lors de la modification', 'error');
            }
        });
    }

    // Fonction pour afficher les notifications
    function showNotification(message, type = 'info') {
        // Créer l'élément de notification s'il n'existe pas
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            document.body.appendChild(notification);
        }

        // Définir le style en fonction du type
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Afficher la notification
        notification.style.display = 'block';

        // La masquer après 3 secondes
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Gérer le chatbot
    window.openChatbot = function () {
        // On ajoute un timestamp unique à l'URL pour forcer le navigateur à charger la dernière version de index.html,
        // plutôt que d'utiliser une version mise en cache. Le timestamp change à chaque appel, donc l'URL est unique
        // à chaque fois et le navigateur ne prendra pas la version en cache.
        const chatbotUrl = `../index.html?${new Date().getTime()}`;
        if (document.getElementById('chatbotModal')) {
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'chatbotModal';
        modal.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
        `;

        const iframe = document.createElement('iframe');
        iframe.src = chatbotUrl;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 10px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: -10px;
            right: -10px;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #ff4444;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 16px;
        `;
        closeBtn.onclick = () => modal.remove();

        modal.appendChild(iframe);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    };

    // Chargement initial
    loadData();

});
