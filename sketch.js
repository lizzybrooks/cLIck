let searchInput, searchResults;
let data;
let click;
let bar;
let GalleryButton;

let numRows = 2; // Initial number of rows
let numCols = 7;
let boxSize = 50;
let rectangles = [];
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
  createCanvas(900, 850);

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
  searchInput.position(312, 380);
  searchInput.size(200, 25)
  searchInput.changed(search);

  searchResults = createElement('ul');
  searchResults.position(10, 120);

  // Constants for the grid layout
  const gap = 10;
  const cellWidth = (width - (numCols + 1) * gap) / numCols;
  const cellHeight = (height - 50 - 150 - (numRows + 1) * gap) / numRows

  print(cellHeight)

  // Initialize fixed grid of rectangles
  for (let i = 0; i < numCols; i++) {
    for (let j = 0; j < numRows; j++) {
      let box = {
        x: gap + i * (cellWidth + gap), // x position
        y: 450 + j * 200, // modified y position
        width: cellWidth,
        height: cellHeight,

      };
      rectangles.push(box);
    }

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
  }

  // Load Firebase images from the /images folder
  loadFirebaseImages();





  // Add brown circle in the top middle
  fill('#964B00');
  noStroke();
  let circleDiameter = 100;
  let circleX = width / 2;
  let circleY = 150;
  ellipse(circleX, circleY, circleDiameter);


}

function openGalleryPage() {
  // Open a new window with the gallery page
  window.open('https://editor.p5js.org/25daniella.nunez/full/EokJsju9R');
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

  drawRectangles();

  for (let h = 0; h < heartcoordinates.length; h += 2) {
    fill(255, 0, 0);
    noStroke();
    textSize(30);
    text("❤️", heartcoordinates[h], heartcoordinates[h + 1]);
  }
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

function drawRectangles() {
  rectangles.forEach((r) => {
    noFill();
    stroke(77, 41, 13);
    strokeWeight(5);
    rect(r.x, r.y, r.width, r.height / 2 + 20, 20);
  });
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




function drawImages() {
  firebaseImages.forEach((img, index) => {
    if (index < rectangles.length) {
      let r = rectangles[index];
      image(img, r.x + r.width * 0.1, r.y + r.height * 0.1, r.width * 0.8, r.height * 0.4);
    }
  });

  uploadedImages.forEach((upload) => {
    image(upload.img, upload.x, upload.y, upload.w, upload.h);
  });
}

function handleFile(file) {
  const user = firebase.auth().currentUser;
  if (user && file.type === 'image') {
    let droppedOnRect = rectangles.find(r => mouseX > r.x && mouseX < r.x + r.width && mouseY > r.y && mouseY < r.y + r.height);
    if (droppedOnRect) {
      const img = createImg(file.data, '').hide(); // Create image and hide it
      clickSound.play(); // Play click sound
      // Upload file to Firebase Storage
      uploadImageToFirebase(file.file);

    }
  } else if (!user) {
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
  let heartSize = 30;
  let heartX = mouseX
  let heartY = mouseY
  heartcoordinates.push(heartX, heartY)
  //print(heartcoordinates)

}