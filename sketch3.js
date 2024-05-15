let searchInput, searchResults;
let data;
let click;
let bar;
let GalleryButton;

let firebaseImages = [];  // Store p5.Element for Firebase images
let uploadedImages = [];  // Store details for uploaded images

let heartcoordinates = []

let clickSound;

let signInButton, logoutButton;
let userName = "";

// Global variable to manage initialization state
let isDropListenerAdded = false;


function preload() {
    data = loadJSON('people.JSON');
    click = loadImage('click-1.png')
    bar = loadImage('bar-1.png')
    profile = loadImage('ProfileIcon.png')
    // Load click sound
    clickSound = loadSound('click.m4a');
}


function setup() {
    let canvas = createCanvas(900, 4000); // Adjust the height as necessary to fit all rows
    canvas.parent('canvas-container'); // Specify a parent div with a set height and overflow: scroll

    // Initialize the "Sign in with Google" button
    signInButton = createButton('Sign In with Google');
    signInButton.position(20, 20);
    signInButton.mousePressed(signInWithGoogle);

    // Initialize the logout button but hide it initially
    logoutButton = createButton('Logout');
    logoutButton.position(windowWidth - 120, 20); // Upper right corner
    logoutButton.mousePressed(signOut);
    logoutButton.hide();


    searchInput = createInput();
    searchInput.parent('canvas-container'); // Parent the input to the same div
    searchInput.class('fixed-input'); // Apply CSS class for positioning
    searchInput.position(312, 380);
    searchInput.size(200, 25)
    searchInput.changed(search);

    searchResults = createElement('ul');
    searchResults.position(10, 120);


    // Enable dropping files on the canvas


    if (!isDropListenerAdded) {
        let canvas = select('canvas');
        canvas.drop(handleFile);
        isDropListenerAdded = true;
    }

    // Authentication state observer
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            signInButton.hide();
            logoutButton.show();

            userName = user.displayName || "User";



        } else {
            signInButton.show();
            logoutButton.hide();

            userName = "";
        }
    });


    // Load Firebase images from the /images folder
    loadFirebaseImages();



}



function draw() {
    background('#f4f2b4');
    image(click, 185, 40, 455, 400)
    image(bar, 345, 340, 140, 40)

    if (userName) {
        fill(0);
        textSize(16); // Smaller text size
        textAlign(RIGHT, TOP);
        text(`Welcome ${userName}`, windowWidth - 130, 15);
        image(profile, 620, 37, 100, 90)

    }

    drawImages();


  
}


function signInWithGoogle() {
    let provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch((error) => {
        console.error("Error during sign-in:", error.message);
    });
}

function signOut() {
    firebase.auth().signOut().catch((error) => {
        console.error("Sign out error:", error.message);
    });
}




function search() {
    const searchTerm = searchInput.value().toLowerCase();
    const results = [];

    // Search user names
    for (let user of data.users) {
        if (user.name.toLowerCase().includes(searchTerm)) {
            results.push(user);
        }
    }

    // Search keywords
    for (let user of data.users) {
        for (let keyword of user.keywords) {
            if (keyword.toLowerCase().includes(searchTerm) && !results.includes(user)) {
                results.push(user);
            }
        }
    }

    displaySearchResults(results);
}
function displaySearchResults(results) {
    searchResults.html('');
    if (results.length === 0) {
        searchResults.html('No results found');
    } else {
        for (let user of results) {
            const listItem = createElement('li', user.name);
            searchResults.child(listItem);
        }
    }
}


function drawImages() {
    const numCols = 5;          // Number of images per row
    const imageWidth = 100;      // Width of each image
    const gap = 50;             // Gap between images
    const startX = 50;          // Starting x-coordinate
    const startY = 520;          // Starting y-coordinate

    for (let i = 0; i < firebaseImages.length; i++) {
        let img = firebaseImages[i];
        let col = i % numCols;                      // Column index
        let row = Math.floor(i / numCols);          // Row index

        let x = startX + col * (imageWidth + gap);  // Calculate x position
        let y = startY + row * (imageWidth + gap);  // Calculate y position


        fill(255);
        stroke(77, 41, 13);
        strokeWeight(5);
        rect(x - 20, y - 20, imageWidth + 40, imageWidth + 40, 20)

        image(img, x, y, imageWidth, imageWidth);   // Draw each image

        let heartX = x + imageWidth - 10 + 10;  // Heart's x position 10 pixels further right
        let heartY = y + imageWidth - 10;  // Heart's y position
        for (let [hx, hy] of heartcoordinates) {
            if (hx === heartX && hy === heartY) {
                fill(255, 0, 0);
                noStroke();
                textSize(30);
                text("❤️", heartX, heartY);
            }
        }  
    }

    
}



function loadFirebaseImages() {
    const rootRef = firebase.storage().ref('/images');
    rootRef.listAll().then((dirResult) => {
        dirResult.prefixes.forEach((userFolder) => {
            // userFolder is each user's directory containing their images
            userFolder.listAll().then((fileResult) => {
                fileResult.items.forEach((itemRef) => {
                    // Get download URL for each image and create an image element
                    itemRef.getDownloadURL().then((url) => {
                        const img = createImg(url, '').hide();
                        firebaseImages.push(img); // Add to an array for display
                    }).catch((error) => {
                        console.error("Error getting download URL:", error);
                    });
                });
            }).catch((error) => {
                console.error("Error listing files in user folder:", error);
            });
        });
    }).catch((error) => {
        console.error("Error listing user folders in Firebase:", error);
    });
}






function handleFile(file) {
    const user = firebase.auth().currentUser;
    if (user && file.type === 'image') {
        // let droppedOnRect = rectangles.find(r => mouseX > r.x && mouseX < r.x + r.width && mouseY > r.y && mouseY < r.y + r.height);
        // if (droppedOnRect) {
        const img = createImg(file.data, '').hide(); // Create image and hide it
        clickSound.play(); // Play click sound
        // Upload file to Firebase Storage
        uploadImageToFirebase(file.file);

        // }
        // } else if (!user) {
        console.log('No user logged in or file type is not image');
    }
}


function uploadImageToFirebase(file) {
    const user = firebase.auth().currentUser;
    if (user) {
        let storageRef = firebase.storage().ref('/images/' + user.uid + '/' + file.name);
        storageRef.put(file).then((snapshot) => {
            console.log('Uploaded to:', user.uid);
            snapshot.ref.getDownloadURL().then((downloadURL) => {
                const img = createImg(downloadURL, '').hide();
                firebaseImages.push(img); // Manage this array as needed
            });
        }).catch((error) => {
            console.error('Upload failed:', error);
        });
    } else {
        console.log('User is not logged in');
    }
}


function mousePressed() {
    const numCols = 5; // Number of images per row
    const imageWidth = 100; // Width of each image
    const gap = 50; // Gap between images
    const startX = 50; // Starting x-coordinate
    const startY = 520; // Starting y-coordinate

    for (let i = 0; i < firebaseImages.length; i++) {
        let col = i % numCols; // Column index
        let row = Math.floor(i / numCols); // Row index

        let x = startX + col * (imageWidth + gap); // Calculate x position
        let y = startY + row * (imageWidth + gap); // Calculate y position

        // Check if the mouse click is within the bounds of the image
        if (mouseX >= x && mouseX <= x + imageWidth && mouseY >= y && mouseY <= y + imageWidth) {
            let heartX = x + imageWidth - 10 + 10;  // Adjust heart position +10 to the right
            let heartY = y + imageWidth - 10;  // Position for heart in the lower right corner
            heartcoordinates.push([heartX, heartY]);  // Store coordinates
            break;  // Stop the loop once the correct image is found
        }
    }
}
