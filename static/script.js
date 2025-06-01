document.addEventListener("DOMContentLoaded", function () {
    // ========================== Typing Text Effect ==========================
    const texts = [
        `Image forgery is a growing concern in digital media. 
        With advanced editing tools, manipulated images are used in fake news, cyber fraud, and court cases. 
        Identifying fake images manually is challenging, as forgeries can be subtle. AI models make detection faster and more accurate by analyzing pixel inconsistencies. 
        These AI-powered systems help forensic investigations, social media platforms, and digital security by preventing misinformation and ensuring authenticity.`,
    
        `Artificial Intelligence (AI) has transformed image forensics. 
        Traditional methods like metadata analysis often fail against sophisticated forgeries. 
        Deep learning models, especially CNNs, detect hidden signs of manipulation in lighting, textures, and compression artifacts. 
        Techniques like Error Level Analysis (ELA) and Discrete Cosine Transform (DCT) enhance forgery detection by analyzing compression variations. 
        AI-powered verification makes detecting manipulated images more efficient and reliable.`,
    
        `AI-powered tools play a crucial role in verifying image authenticity in news, legal evidence, and forensic investigations. 
        Fake images can lead to misinformation, fraud, and legal disputes. Our system classifies images as authentic or tampered using deep learning. 
        ELA helps identify manipulated regions by detecting compression inconsistencies. The automation of forgery detection ensures digital trust and credibility.`,
    
        `Our project, DECO, is designed to detect image forgery using deep learning. 
        The system analyzes digital images with high accuracy to determine authenticity. 
        By applying CNNs, it identifies tampered areas based on inconsistencies in structure and pixel distribution. 
        Built using Flask, Python, and machine learning models trained on extensive datasets, DECO continuously improves accuracy and provides a robust solution for fraud detection.`,
    
        `The core of DECO is a deep learning model trained on large datasets of authentic and forged images. 
        It recognizes different types of manipulations, including copy-move forgeries, splicing, and retouching. 
        Techniques like DCT, Lexicographic Ordering, and CNNs detect subtle changes indicating tampering. 
        By combining spatial and frequency-based analysis, DECO ensures high precision in forgery detection, maintaining authenticity in journalism, law, and cybersecurity.`
    ];
        
    
    
    let textIndex = 0;
    const container = document.getElementById("container-text");

    function typeWriter(text, index = 0) {
        if (index < text.length) {
            container.innerHTML += text.charAt(index);
            setTimeout(() => typeWriter(text, index + 1), 30); // Faster typing speed
        } else {
            setTimeout(() => {
                container.innerHTML = "";
                textIndex = (textIndex + 1) % texts.length;
                typeWriter(texts[textIndex]);
            }, 3000);
        }
    }
    typeWriter(texts[textIndex]);


    // ========================== Arrow Wave Effect ==========================
    function startWaveEffect() {
        document.querySelectorAll("#slider i").forEach((arrow, index) => {
            setTimeout(() => {
                arrow.style.opacity = "1";
                setTimeout(() => (arrow.style.opacity = "0.3"), 300);
            }, index * 300);
        });
    }
    setInterval(startWaveEffect, 1200);

    // ========================== Image Upload and Preview ==========================
    const fileInput = document.getElementById("file-input");
    const uploadBox = document.getElementById("upload-box");
    const imagePreview = document.getElementById("image-preview");
    const scanButton = document.getElementById("scan-button");
    let selectedFile = null;

    fileInput.addEventListener("change", function (event) {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
                uploadBox.style.display = "none";
                scanButton.style.display = "block";
            };
            reader.readAsDataURL(selectedFile);
        }
    });

    // ========================== Scan Animation & Backend Processing ==========================
    const mainEle = document.getElementById("main-ele");
    scanButton.addEventListener("click", function () {
        if (!selectedFile) {
            alert("Please select an image first.");
            return;
        }

        let count = 0,
            maxRepeats = 3;
        function startScanEffect() {
            mainEle.classList.add("wave-active");
            setTimeout(() => {
                mainEle.classList.remove("wave-active");
                if (++count < maxRepeats) {setTimeout(startScanEffect, 500);}
                else {processImage(); alert("Your Report is Generated, Please Scroll down!")};
            }, 1000);
        }
        startScanEffect();
    });

    // ========================== Send Image to Backend ==========================
    function processImage() {
        const formData = new FormData();
        formData.append("file", selectedFile);
    
        fetch("/predict", { method: "POST", body: formData })
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
    
                document.getElementById("output-ele").style.display = "block";
                document.getElementById("output-image").src = data.ela_image;
                
                const resultText = document.getElementById("result-text");
                resultText.innerText = data.result;
    
                // Change text color based on result
                resultText.style.color = (data.result.toLowerCase() === "tempered") ? "#ff4d4d" : "#28a745";
    
    
                // Fetch training accuracy data
                fetch("/static/accuracy.json")
                    .then((res) => res.json())
                    .then((accuracyData) => {
                        document.getElementById("accuracy").innerText = `${((accuracyData.train_accuracy + accuracyData.validation_accuracy)/2 *100).toFixed(4)}%`;
                        document.getElementById("confidence").innerText = `${(accuracyData.validation_accuracy * 100).toFixed(2)}%`;

                        document.getElementById("train-accuracy").innerText = `${(accuracyData.train_accuracy * 100).toFixed(2)}%`;
                        document.getElementById("val-accuracy").innerText = `${(accuracyData.validation_accuracy * 100).toFixed(2)}%`;
                        document.getElementById("train-loss").innerText = `${(accuracyData.train_loss * 100).toFixed(2)}%`;
                        document.getElementById("val-loss").innerText = `${(accuracyData.validation_loss * 100).toFixed(2)}%`;
                    })
                    .catch((error) => console.error("Error fetching accuracy data:", error));
    
                const img = new Image();
                img.onload = () => {
                    generateHistogram(img);
                    displayImageDetails(selectedFile, img.width, img.height);
                };
                img.src = URL.createObjectURL(selectedFile);
            })
            .catch((error) => console.error("Error:", error));
            
    }    
    

    // ========================== Generate Histogram ==========================
    function generateHistogram(img) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        const red = new Uint32Array(256),
            green = new Uint32Array(256),
            blue = new Uint32Array(256);

        for (let i = 0; i < data.length; i += 4) {
            red[data[i]]++;
            green[data[i + 1]]++;
            blue[data[i + 2]]++;
        }

        drawGraph(red, green, blue);
    }

    // ========================== Draw Graph (RGB Bar Chart) ==========================
    function drawGraph(red, green, blue) {
        const ctx = document.getElementById("graph").getContext("2d");

        if (window.rgbChart) window.rgbChart.destroy();

        window.rgbChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: Array.from({ length: 256 }, (_, i) => i),
                datasets: [
                    { label: "Red", data: red, backgroundColor: "rgb(255, 0, 0)" },
                    { label: "Green", data: green, backgroundColor: "rgb(0, 255, 0)" },
                    { label: "Blue", data: blue, backgroundColor: "rgb(0, 0, 255)" }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: "Intensity (0-255)" } },
                    y: { title: { display: true, text: "Pixel Count" } }
                }
            }
        });
    }

    // ========================== Display Image Details ==========================
    function displayImageDetails(file, width, height) {
        document.getElementById("image-details").innerHTML = `
            <b>File Name:  ${file.name} <br>
            <b>Width:  ${width}px <br>
            <b>Height:  ${height}px <br>
            <b>File Size:  ${(file.size / 1024).toFixed(2)} KB <br>
            <b>Scanned At:  ${new Date().toLocaleString()}
        `;
    }
});
