<?php
include('../classetechinque/database.php');
header('Content-Type: application/json');

class ChatbotAdmin {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Validation des entrées
    private function validateInput($data) {
        // Supprimer les espaces inutiles sans convertir les caractères spéciaux
        return trim($data);
    }

    // Vérifier si une requête est en AJAX
    private function isAjaxRequest() {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
            strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }

    // Lister toutes les questions avec leurs réponses
    public function list() {
        try {
            $stmt = $this->pdo->query('
                SELECT q.id, q.question, q.categorie, r.reponse, q.date_creation 
                FROM question q 
                LEFT JOIN reponse r ON q.reponse_id = r.id
                ORDER BY q.date_creation DESC
            ');
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            return ['error' => 'Erreur lors de la récupération des données'];
        }
    }

    // Obtenir une question spécifique
    public function get($id) {
        try {
            $stmt = $this->pdo->prepare('
                SELECT q.id, q.question, q.categorie, r.reponse 
                FROM question q 
                LEFT JOIN reponse r ON q.reponse_id = r.id 
                WHERE q.id = ?
            ');
            $stmt->execute([intval($id)]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return ['error' => 'Question non trouvée'];
            }
            return $result;
        } catch(PDOException $e) {
            return ['error' => 'Erreur lors de la récupération de la question'];
        }
    }

    // Ajouter une nouvelle question/réponse
    public function add($question, $categorie, $reponse) {
        if (empty($question) || empty($reponse)) {
            return ['error' => 'La question et la réponse sont requises'];
        }

        try {
            $this->pdo->beginTransaction();

            // Insérer d'abord la réponse
            $stmt = $this->pdo->prepare('INSERT INTO reponse (reponse) VALUES (?)');
            $stmt->execute([$this->validateInput($reponse)]);
            $reponse_id = $this->pdo->lastInsertId();

            // Puis insérer la question
            $stmt = $this->pdo->prepare('
                INSERT INTO question (question, categorie, reponse_id) 
                VALUES (?, ?, ?)
            ');
            $stmt->execute([
                $this->validateInput($question),
                intval($categorie),
                $reponse_id
            ]);

            $this->pdo->commit();
            return ['success' => true, 'id' => $this->pdo->lastInsertId()];
        } catch(PDOException $e) {
            $this->pdo->rollBack();
            return ['error' => 'Erreur lors de l\'ajout de la question'];
        }
    }

    // Modifier une question/réponse
    public function edit($id, $question, $categorie, $reponse) {
        if (empty($id) || empty($question) || empty($reponse)) {
            return ['error' => 'Tous les champs sont requis'];
        }

        try {
            $this->pdo->beginTransaction();

            // Récupérer l'ID de la réponse existante
            $stmt = $this->pdo->prepare('SELECT reponse_id FROM question WHERE id = ?');
            $stmt->execute([intval($id)]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                throw new PDOException('Question non trouvée');
            }

            $reponse_id = $result['reponse_id'];

            // Mettre à jour la réponse
            $stmt = $this->pdo->prepare('UPDATE reponse SET reponse = ? WHERE id = ?');
            $stmt->execute([
                $this->validateInput($reponse),
                $reponse_id
            ]);

            // Mettre à jour la question
            $stmt = $this->pdo->prepare('UPDATE question SET question = ?, categorie = ? WHERE id = ?');
            $stmt->execute([
                $this->validateInput($question),
                intval($categorie),
                intval($id)
            ]);

            $this->pdo->commit();
            return ['success' => true];
        } catch(PDOException $e) {
            $this->pdo->rollBack();
            return ['error' => 'Erreur lors de la modification de la question'];
        }
    }

    // Supprimer une question/réponse
    public function delete($id) {
        if (empty($id)) {
            return ['error' => 'ID non valide'];
        }

        try {
            $this->pdo->beginTransaction();

            // Récupérer l'ID de la réponse
            $stmt = $this->pdo->prepare('SELECT reponse_id FROM question WHERE id = ?');
            $stmt->execute([intval($id)]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                throw new PDOException('Question non trouvée');
            }

            $reponse_id = $result['reponse_id'];

            // Vérifier si des sous-questions existent
            $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM question WHERE categorie = ?');
            $stmt->execute([intval($id)]);
            $hasChildren = $stmt->fetchColumn() > 0;

            if ($hasChildren) {
                $this->pdo->rollBack();
                return ['error' => 'Cette question a des sous-questions. Supprimez-les d\'abord.'];
            }

            // Supprimer la question
            $stmt = $this->pdo->prepare('DELETE FROM question WHERE id = ?');
            $stmt->execute([intval($id)]);

            // Supprimer la réponse si elle existe
            if ($reponse_id) {
                $stmt = $this->pdo->prepare('DELETE FROM reponse WHERE id = ?');
                $stmt->execute([intval($reponse_id)]);
            }

            $this->pdo->commit();
            return ['success' => true];
        } catch(PDOException $e) {
            $this->pdo->rollBack();
            return ['error' => 'Erreur lors de la suppression de la question'];
        }
    }
}

// Vérification de la méthode HTTP
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') {
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

// Instancier l'admin
$admin = new ChatbotAdmin($pdo);

// Traiter la requête
$action = $_REQUEST['action'] ?? '';
$response = [];

switch($action) {
    case 'list':
        $response = $admin->list();
        break;

    case 'get':
        $id = $_GET['id'] ?? 0;
        $response = $admin->get($id);
        break;

    case 'add':
        if ($method !== 'POST') {
            $response = ['error' => 'Méthode non autorisée pour l\'ajout'];
            break;
        }
        $question = $_POST['question'] ?? '';
        $categorie = $_POST['categorie'] ?? 0;
        $reponse = $_POST['reponse'] ?? '';
        $response = $admin->add($question, $categorie, $reponse);
        break;

    case 'edit':
        if ($method !== 'POST') {
            $response = ['error' => 'Méthode non autorisée pour la modification'];
            break;
        }
        $id = $_POST['id'] ?? 0;
        $question = $_POST['question'] ?? '';
        $categorie = $_POST['categorie'] ?? 0;
        $reponse = $_POST['reponse'] ?? '';
        $response = $admin->edit($id, $question, $categorie, $reponse);
        break;

    case 'delete':
        $id = $_GET['id'] ?? 0;
        $response = $admin->delete($id);
        break;

    case 'updateCategory':
        if ($method !== 'POST') {
            $response = ['error' => 'Méthode non autorisée pour cette action'];
            break;
        }
        $id = $_POST['id'] ?? 0;
        $categorie = $_POST['categorie'] ?? 0;
        $response = $admin->updateCategory($id, $categorie);
        break;

    default:
        $response = ['error' => 'Action non valide'];
}

echo json_encode($response);


