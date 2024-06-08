document.addEventListener("DOMContentLoaded", function() {
    // Initialize Fabric.js canvas
    var canvas = new fabric.Canvas('c', {
        width: 800,
        height: 400
    });

    // Function to add text with a width limit
    function addLimitedWidthText() {
        var textInput = document.getElementById('textInput').value;
        var widthPercentage = parseInt(document.getElementById('widthPercentageInput').value, 10);
        var canvasWidth = canvas.getWidth();
        var maxWidth = (widthPercentage / 100) * canvasWidth;

        var text = new fabric.Text(textInput, {
            fontSize: 24,
            fill: 'black',
            originX: 'center',
            originY: 'center',
            left: canvasWidth / 2,
            top: canvas.getHeight() / 2
        });

        canvas.add(text);
        resizeTextToFitWidth(text, maxWidth);
    }

    // Function to resize text to fit within the specified width
    function resizeTextToFitWidth(text, maxWidth) {
        var context = canvas.getContext('2d');
        var fontSize = text.fontSize;

        text.set({ fontSize: fontSize });
        while (context.measureText(text.text).width > maxWidth && fontSize > 1) {
            fontSize--;
            text.set({ fontSize: fontSize });
        }
        text.set({ left: canvas.getWidth() / 2 }); // Ensure the text remains centered
        canvas.renderAll();
    }

    // Add event listener to the button
    document.getElementById('addLimitedWidthText').addEventListener('click', addLimitedWidthText);
});
