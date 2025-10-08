document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('start-button');
    const galleryButton = document.getElementById('gallery-button');
    const galleryInput = document.getElementById('gallery-input');
    const homeScreen = document.getElementById('home-screen');
    const scannerScreen = document.getElementById('scanner-screen');
    const reloadButton = document.getElementById('reload-button');

    if (!startButton) console.error("Start Button not found!");

    startButton.addEventListener('click', () => {
        homeScreen.style.display = 'none';
        scannerScreen.style.display = 'block';
        startCamera();
    });

    if (galleryButton && galleryInput) {
        galleryButton.addEventListener('click', () => galleryInput.click());
        galleryInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) processGalleryImage(file);
        });
    }

    if (reloadButton) {
        reloadButton.addEventListener('click', () => location.reload());
    } else console.error("Reload button not found!");
});

let cameraInput;
let capturedImage;
let extractedTextElement;
let harmfulIngredientsData = {};

fetch('ingredients.json')
    .then(response => response.json())
    .then(data => { harmfulIngredientsData = data.harmfulIngredients; })
    .catch(error => console.error("Error loading ingredients JSON:", error));

function setup() {
    noCanvas();
    extractedTextElement = document.getElementById('extracted-text');
}

function startCamera() {
    const constraints = { video: { facingMode: "environment" } };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            cameraInput = createCapture(VIDEO);
            cameraInput.size(400, 300);
            cameraInput.parent('video-container');
            cameraInput.elt.srcObject = stream;

            const scanButton = document.getElementById('scan-button');
            const editButton = document.getElementById('edit-button');
            const saveButton = document.getElementById('save-button');

            if (scanButton) scanButton.addEventListener('click', captureImage);
            if (editButton) editButton.addEventListener('click', enableEditing);
            if (saveButton) saveButton.addEventListener('click', saveChanges);
        })
        .catch(function(error) { console.error("Error accessing the camera:", error); });
}

function captureImage() {
    let captureCanvas = createGraphics(400, 300);
    captureCanvas.image(cameraInput, 0, 0, 400, 300);

    let capturedImageDiv = document.getElementById('captured-image');
    capturedImageDiv.innerHTML = '';
    let imageElement = createImg(captureCanvas.canvas.toDataURL(), "Captured Image");
    capturedImageDiv.appendChild(imageElement.elt);

    extractTextFromImage(captureCanvas.canvas);
}

function processGalleryImage(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const width = img.width;
            const height = img.height;

            const canvas = createGraphics(width, height);
            canvas.drawingContext.drawImage(img, 0, 0, width, height);

            let capturedImageDiv = document.getElementById('captured-image');
            capturedImageDiv.innerHTML = '';
            let imageElement = createImg(canvas.canvas.toDataURL(), "Selected Image");
            capturedImageDiv.appendChild(imageElement.elt);

            extractTextFromImage(canvas.canvas);
        };
    };
    reader.readAsDataURL(file);
}

function extractTextFromImage(imageCanvas) {
    Tesseract.recognize(imageCanvas, 'eng', { logger: m => console.log(m) })
        .then(result => {
            const extractedText = result.data.text;
            displayExtractedText(extractedText);
            checkAllergiesThenHarmful(extractedText);
        })
        .catch(error => console.error("Error during text extraction:", error));
}

function displayExtractedText(text) {
    extractedTextElement.value = text;
}

function checkAllergiesThenHarmful(extractedText) {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection("users").doc(user.uid).get().then(doc => {
                let allergyAlerts = [];
                if (doc.exists) {
                    const allergies = doc.data().allergies || [];
                    const text = extractedText.toLowerCase();
                    allergyAlerts = allergies.filter(a => text.includes(a.toLowerCase()));
                }

                if (allergyAlerts.length > 0) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Allergy Alert!',
                        text: `This product contains allergens: ${allergyAlerts.join(', ')}`
                    }).then(() => detectHarmfulIngredients(extractedText));
                } else {
                    detectHarmfulIngredients(extractedText);
                }
            });
        } else {
            detectHarmfulIngredients(extractedText);
        }
    });
}

function detectHarmfulIngredients(extractedText) {
    const cleanedText = extractedText.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const words = cleanedText.split(' ');
    const ignoredWords = new Set(['and', 'or', 'with', 'sugar', 'salt', 'water']);
    const filteredWords = words.filter(word => !ignoredWords.has(word));

    const synonymMap = { 'vitamin c': 'ascorbic acid', 'e300': 'ascorbic acid', 'e330': 'citric acid' };
    const foundDiseases = new Set();

    for (let i = 0; i < filteredWords.length; i++) {
        let singleWord = filteredWords[i];
        let bigram = (i < filteredWords.length - 1) ? filteredWords[i] + ' ' + filteredWords[i + 1] : null;

        let ingredientSingle = synonymMap[singleWord] || singleWord;
        let ingredientBigram = bigram ? (synonymMap[bigram] || bigram) : null;

        if (harmfulIngredientsData[ingredientSingle]) harmfulIngredientsData[ingredientSingle].diseases.forEach(d => foundDiseases.add(d));
        if (ingredientBigram && harmfulIngredientsData[ingredientBigram]) harmfulIngredientsData[ingredientBigram].diseases.forEach(d => foundDiseases.add(d));
    }

    async function analyzeWithAI(text) {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                    "Authorization": "Bearer YOUR_OPENAI_KEY",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                        { role: "system", content: "You are a food safety expert." },
                        { role: "user", content: `Analyze ingredients:\n${text}\nList harmful substances and possible health risks.` }
                ],
                temperature: 0.5
            })
        });
        const result = await response.json();
            return result.choices[0]?.message?.content || "AI could not analyze this text.";
    } catch (error) {
        console.error("AI analysis error:", error);
        return "AI analysis failed.";
    }
}

if (foundDiseases.size > 0) {
    Swal.fire({
        icon: 'error',
        title: 'Harmful ingredients detected!',
        text: 'Click "Show Risks" for detailed risks, or "AI Analysis" for deeper insights.',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Show Risks',
        cancelButtonText: 'OK',
        denyButtonText: 'AI Analysis'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                icon: 'warning',
                title: 'Potential risks identified:',
                text: Array.from(foundDiseases).join(', '),
                confirmButtonText: 'OK'
            });
        } else if (result.isDenied) {
            const aiResult = await analyzeWithAI(extractedText);
            Swal.fire({
                icon: 'info',
                title: 'AI Insights:',
                text: aiResult,
                confirmButtonText: 'OK'
            });
        }
    });
    } else {
        Swal.fire({
            icon: 'success', // Green tick mark
            title: 'No harmful ingredients detected.',
            confirmButtonText: 'OK'
        });
    }
    // Check allergies after checking harmful ingredients
    checkUserAllergies(extractedText);

}


function enableEditing() {
    const textarea = document.getElementById('extracted-text');
    textarea.readOnly = false;
    document.getElementById('edit-button').style.display = 'none';
    document.getElementById('save-button').style.display = 'inline';
}

function saveChanges() {
    const textarea = document.getElementById('extracted-text');
    const editedText = textarea.value;

    localStorage.setItem('editedExtractedText', editedText);

    textarea.readOnly = true;
    document.getElementById('edit-button').style.display = 'inline';
    document.getElementById('save-button').style.display = 'none';

    checkHarmfulIngredients(editedText);
}



