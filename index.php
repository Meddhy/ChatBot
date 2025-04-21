<?php
include('classetechinque/database.php');

header('Content-Type: application/json');


$requestData = json_decode(file_get_contents('php://input'), true);
$userQuestion = isset($requestData['question']) ? trim($requestData['question']) : "";

// Réponse par défaut
$defaultResponse = "Bonjour, comment puis-je vous aider ?";
$responseMessage = $defaultResponse;
$responseOptions = [];

if ($userQuestion === "") {
    $stmt = $pdo->prepare("SELECT question FROM question WHERE categorie = 0");
    $stmt->execute();
    $responseOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
} else {
    $stmt = $pdo->prepare("
        SELECT q.id, q.question, q.categorie, r.reponse
        FROM question q
        LEFT JOIN reponse r ON q.reponse_id = r.id
        WHERE q.question = :question
    ");
    $stmt->bindParam(':question', $userQuestion, PDO::PARAM_STR);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        $responseMessage = $result['reponse'] ?? "Veuillez préciser votre question, en sélectionnant une des catégories ci-dessous.";
        $stmt = $pdo->prepare("SELECT question FROM question WHERE categorie = :categorie");
        $stmt->bindParam(':categorie', $result['id'], PDO::PARAM_INT);
        $stmt->execute();
        $responseOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($responseOptions)) {
            $stmt = $pdo->prepare("SELECT question FROM question WHERE categorie = 0");
            $stmt->execute();
            $responseOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
    } else {
        $responseMessage = "Je ne comprends pas votre question. Voici ce que je peux faire :";
        $stmt = $pdo->prepare("SELECT question FROM question WHERE categorie = 0");
        $stmt->execute();
        $responseOptions = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
}

echo json_encode([
    'reponse' => $responseMessage,
    'options' => $responseOptions,
]);
?>
