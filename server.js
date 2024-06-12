const express = require('express');
const fs = require('fs');
const { fabric } = require('fabric');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');
const dotenv = require('dotenv');
const request = require('request');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
//const session = require('express-session');

const session = require('cookie-session');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));


app.post('/logout', (req, res) => {
    req.session = null; // Destroy the session
    res.redirect('/'); // Redirect to login page
});

const authenticateUser = (username, password) => {
    console.log('Comparing:', username, password, process.env.USER, process.env.PASS);
    return username === process.env.USER && password === process.env.PASS;
};

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const registerFontDynamically = (fontFamily) => {
    const fontPath = path.join(__dirname, 'fonts', `${fontFamily}.ttf`);
    console.log('Attempting to register font:', fontPath);
    if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: fontFamily });
        console.log(`Font registered: ${fontFamily}`);
    } else {
        console.warn(`Font not found: ${fontFamily}`);
    }
};

// Serve login page at root if not authenticated
app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.sendFile(path.join(__dirname, 'protected', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/env', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_KEY: process.env.SUPABASE_KEY
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (authenticateUser(username, password)) {
        req.session.authenticated = true;
        res.redirect('/');
    } else {
        res.redirect('/?error=Invalid%20credentials');
    }
});

app.use('/protected', (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/?error=Unauthorized');
    }
});

app.use('/protected', express.static(path.join(__dirname, 'protected')));

app.get('/update-canvas', async (req, res) => {
    const queryParams = req.query;
    const templateName = queryParams.dbtemplate;
    const apiKey = queryParams.apikey;

    // Check if the API key is provided and valid
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).send('Unauthorized: Invalid API key');
    }

    if (Object.keys(queryParams).length === 0) {
        return res.status(400).send('No parameters provided for updating images or text');
    }

    // Delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


    // Introduce a 5-second delay
    await delay(5000);

    if (templateName) {
      console.log('Fetching template:', templateName);


    try {
        let templateData;

        if (templateName) {
            // Fetch the template from Supabase
           // const { data, error } = await supabase
                //.from('templates')
                //.select('template')
                //.eq('name', templateName)
               // .single();
            console.log('Start fetching template');
const { data, error } = await supabase
  .from('templates')
  .select('template')
  .eq('name', templateName)
  .single();
console.log('Template fetch attempt completed');


            if (error) {
                console.error('Error fetching template:', error);
                return res.status(500).send('Error fetching template from database');
            }

            if (data && data.template) {
                templateData = data.template;
                console.log(`Template '${templateName}' loaded from database.`);
            } else {
                return res.status(404).send('Template not found in the database');
            }
        } else {
            // Load the default template JSON
            const templatePath = path.join(__dirname, 'template.json');
            if (!fs.existsSync(templatePath)) {
                return res.status(404).send('Default template file not found');
            }

            templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
            console.log('Default template JSON loaded.');
        }

        // Register fonts dynamically based on the template JSON
        templateData.canvas.objects.forEach(obj => {
            if (obj.type === 'text' || obj.type === 'textbox') {
                registerFontDynamically(obj.fontFamily);
            }
        });

        // Create a canvas and load the template
        const canvas = new fabric.Canvas(null, {
            width: templateData.size.width,
            height: templateData.size.height
        });

        canvas.loadFromJSON(templateData.canvas, async () => {
            console.log('Canvas loaded from JSON.');

            // Update texts and textboxes based on query parameters
            canvas.getObjects().forEach(obj => {
                if ((obj.type === 'text' || obj.type === 'textbox') && obj.text.includes('{{')) {
                    const matches = obj.text.match(/{{(.*?)}}/g);
                    if (matches) {
                        matches.forEach(match => {
                            const key = match.replace('{{', '').replace('}}', '');
                            if (queryParams[key]) {
                                obj.set('text', queryParams[key].replace(/\\n/g, '\n'));
                                // Use the fontFamily and fontSize from the template JSON
                                obj.set('fontFamily', obj.fontFamily || 'Lobster');
                                obj.set('fontSize', obj.fontSize || 24); // default to 24 if fontSize is not specified
                            }
                        });
                    }
                }

                // Check if the text needs to fit within 80% of the canvas width
                if (obj.type === 'text' && obj.isFittingText) {
                    const maxWidth = canvas.width * obj.fittingPercentage;
                    let scaleFactor = maxWidth / obj.width;
                    obj.set({
                        fontSize: obj.fontSize * scaleFactor,
                        scaleX: 1,
                        scaleY: 1
                    });
                    obj.setCoords();
                }

            });

            // Handle image updates if parameters are provided
            for (const [key, newImageUrl] of Object.entries(queryParams)) {
                // Find the group by ID
                const group = canvas.getObjects().find(obj => obj.id === key);
                if (group && group.type === 'group') {
                    console.log('Group found:', key);

                    // Load the new image
                    const img = await new Promise((resolve, reject) => {
                        fabric.Image.fromURL(newImageUrl, (img) => {
                            if (img) resolve(img);
                            else reject(new Error('Failed to load image'));
                        });
                    });
                    console.log('New image loaded.');

                    // Capture the current properties of the mask
                    const mask = group.clipPath;
                    if (!mask) {
                        return res.status(404).send(`ClipPath (mask) not found in the group for ID ${key}`);
                    }
                    console.log('Mask details:', {
                        type: mask.type,
                        radius: mask.radius,
                        width: mask.width,
                        height: mask.height
                    });

                    // Calculate the scale factor to cover the entire shape
                    let scaleFactor;
                    if (mask.type === 'circle') {
                        const maskDiameter = mask.radius * 2;
                        const scaleX = maskDiameter / img.width;
                        const scaleY = maskDiameter / img.height;
                        scaleFactor = Math.max(scaleX, scaleY);
                    } else {
                        const maskSize = mask.width;
                        const scaleX = maskSize / img.width;
                        const scaleY = maskSize / img.height;
                        scaleFactor = Math.max(scaleX, scaleY);
                    }
                    console.log('Image scale factor:', scaleFactor);

                    img.scale(scaleFactor);
                    img.set({
                        originX: 'center',
                        originY: 'center',
                        left: mask.left + (mask.width || mask.radius * 2) / 2,
                        top: mask.top + (mask.height || mask.radius * 2) / 2
                    });

                    //console.log('Image properties set:', img);

                    // Create a new group with the new image and the existing mask
                    const newGroup = new fabric.Group([img], {
                        left: group.left,
                        top: group.top,
                        angle: group.angle,
                        scaleX: group.scaleX,
                        scaleY: group.scaleY,
                        originX: group.originX,
                        originY: group.originY,
                        clipPath: mask,
                        id: group.id
                    });

                    // Get the original group index
                    const groupIndex = canvas.getObjects().indexOf(group);

                    // Remove the old group and add the new group to the canvas at the same index
                    canvas.remove(group);
                    canvas.insertAt(newGroup, groupIndex);

                    console.log(`New group for ${key} created and added to canvas at index ${groupIndex}.`);
                }
            }

            // Render the canvas to a PNG buffer
            const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

            console.log('Canvas rendered to PNG.');

            res.setHeader('Content-Type', 'image/png');
            res.send(Buffer.from(base64Data, 'base64'));
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Environment Variables:', process.env.USER, process.env.PASS);
});
