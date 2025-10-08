window.addEventListener("load", function () {
  console.log("Auth + Sidebar loaded ✅");

  // ---------------- DOM Elements ----------------
  const authChoiceScreen = document.getElementById("auth-choice-screen");
  const signupScreen = document.getElementById("signup-screen");
  const loginScreen = document.getElementById("login-screen");

  const chooseLoginBtn = document.getElementById("choose-login");
  const chooseSignupBtn = document.getElementById("choose-signup");
  const backToChoiceBtn = document.getElementById("back-to-choice");
  const backToChoiceLoginBtn = document.getElementById("back-to-choice-login");

  const emailInput = document.getElementById("user-email");
  const passwordInput = document.getElementById("user-password");
  const loginBtn = document.getElementById("login-button");
  const signupBtn = document.getElementById("signup-button");
  const authError = document.getElementById("auth-error");

  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menu-toggle");
  const closeSidebar = document.getElementById("close-sidebar");
  const accountSettingsBtn = document.getElementById("account-settings-btn");
  const accountSettings = document.getElementById("account-settings");
  const displayNameInput = document.getElementById("display-name");
  const displayEmailInput = document.getElementById("display-email");
  const saveAccountBtn = document.getElementById("save-account-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (typeof firebase === "undefined" || !firebase.auth) {
    console.error("❌ Firebase Auth not initialized. Check firebase.js");
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // ---------------- Sidebar Logic ----------------
  menuToggle.addEventListener("click", () => sidebar.classList.add("active"));
  closeSidebar.addEventListener("click", () => sidebar.classList.remove("active"));

// Account Settings button
  accountSettingsBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
          const doc = await db.collection("users").doc(user.uid).get();
          if (!doc.exists) return;

          const data = doc.data();

          Swal.fire({
              title: 'Edit Account Details',
              html:
                  `<input id="swal-name" class="swal2-input" placeholder="Name" value="${data.name || ''}">` +
                  `<input id="swal-age" type="number" class="swal2-input" placeholder="Age" value="${data.age || ''}">` +
                  `<select id="swal-gender" class="swal2-input">
                      <option value="" ${!data.gender ? 'selected' : ''}>Select Gender</option>
                      <option value="male" ${data.gender === 'male' ? 'selected' : ''}>Male</option>
                      <option value="female" ${data.gender === 'female' ? 'selected' : ''}>Female</option>
                      <option value="other" ${data.gender === 'other' ? 'selected' : ''}>Other</option>
                  </select>` +
                  `<input id="swal-allergies" class="swal2-input" placeholder="Allergies (comma separated)" value="${(data.allergies || []).join(', ')}">` +
                  `<input id="swal-email" class="swal2-input" placeholder="Email" value="${data.email}" readonly>`,
              showCancelButton: true,
              confirmButtonText: 'Save',
              preConfirm: () => {
                  const name = document.getElementById('swal-name').value.trim();
                  const age = parseInt(document.getElementById('swal-age').value.trim());
                  const gender = document.getElementById('swal-gender').value;
                  const allergies = document.getElementById('swal-allergies').value
                      .split(',')
                      .map(a => a.trim())
                      .filter(a => a !== '');

                  if (!name || !age || !gender) {
                      Swal.showValidationMessage("Please fill in all required fields!");
                      return false;
                  }

                  return { name, age, gender, allergies };
              }
          }).then((result) => {
              if (result.isConfirmed && result.value) {
                  const { name, age, gender, allergies } = result.value;
                  db.collection("users").doc(user.uid).set({ name, age, gender, allergies }, { merge: true })
                      .then(() => Swal.fire("Saved!", "Your account details have been updated.", "success"))
                      .catch(err => Swal.fire("Error", err.message, "error"));
              }
          });

      } catch (error) {
          console.error("Error fetching user data:", error);
      }
  });


  saveAccountBtn.addEventListener("click", () => {
    const name = displayNameInput.value.trim();
    const user = auth.currentUser;

    if (user) {
      db.collection("users").doc(user.uid).set({ name, email: user.email }, { merge: true })
        .then(() => {
          Swal.fire("Updated!", "Your account info has been saved.", "success");
        })
        .catch((err) => {
          Swal.fire("Error", err.message, "error");
        });
    }
  });

  logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => {
      authChoiceScreen.style.display = "flex";
      signupScreen.style.display = "none";
      loginScreen.style.display = "none";
      document.getElementById("home-screen").style.display = "none";
      sidebar.classList.remove("active");
    });
  });

  // ---------------- Auth Choice Logic ----------------
  chooseSignupBtn.addEventListener("click", () => {
    authChoiceScreen.style.display = "none";
    signupScreen.style.display = "flex";
  });

  chooseLoginBtn.addEventListener("click", () => {
    authChoiceScreen.style.display = "none";
    loginScreen.style.display = "flex";
  });

  backToChoiceBtn.addEventListener("click", () => {
    signupScreen.style.display = "none";
    authChoiceScreen.style.display = "flex";
  });

  backToChoiceLoginBtn.addEventListener("click", () => {
    loginScreen.style.display = "none";
    authChoiceScreen.style.display = "flex";
  });

  // ---------------- Signup Logic ----------------
  signupBtn.addEventListener("click", () => {
      const name = document.getElementById("user-name").value.trim();
      const age = document.getElementById("user-age").value.trim();
      const gender = document.getElementById("user-gender").value;
      const email = document.getElementById("user-email").value.trim();
      const password = document.getElementById("user-password").value.trim();
      const allergies = document.getElementById("user-allergies").value.trim();

      if (!name || !age || !gender || !email || !password) {
          authError.textContent = "Please fill in all fields.";
          return;
      }

      auth.createUserWithEmailAndPassword(email, password)
          .then((userCredential) => {
              const user = userCredential.user;

              // Save info in Firestore as a complete object
              return db.collection("users").doc(user.uid).set({
                  name: name,
                  age: parseInt(age),
                  gender: gender,
                  email: email,
                  allergies: allergies ? allergies.split(',').map(a => a.trim()) : []
              });
          })
          .then(() => {
              // Successfully saved all info
              displayEmailInput.value = email;
              authScreen.style.display = "none";
              document.getElementById("home-screen").style.display = "block";
          })
          .catch((error) => {
              console.error(error);
              authError.textContent = error.message;
          });
  });


  // ---------------- Login Logic ----------------
  loginBtn.addEventListener("click", () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      authError.textContent = "Please enter email and password.";
      return;
    }

    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        db.collection("users").doc(user.uid).get()
          .then(doc => {
            if (doc.exists) {
              const data = doc.data();
              console.log("User info:", data);
              // Access allergies
              const userAllergies = data.allergies || [];
              console.log("Allergies:", userAllergies);
              // You can also display it somewhere in UI
              document.getElementById("profile-allergies").textContent = userAllergies.join(', ');
            }
          });

        loginScreen.style.display = "none";
        document.getElementById("home-screen").style.display = "block";
      })
      .catch((error) => {
        if (error.code === "auth/user-not-found") {
          Swal.fire({
            icon: "info",
            title: "Account not found",
            text: "Do you want to sign up?",
            showCancelButton: true,
            confirmButtonText: "Sign Up",
          }).then((result) => {
            if (result.isConfirmed) {
              loginScreen.style.display = "none";
              signupScreen.style.display = "flex";
            }
          });
        } else {
          authError.textContent = error.message;
        }
      });

  });

  // ---------------- Persist Login ----------------
  auth.onAuthStateChanged((user) => {
    if (user) {
      authChoiceScreen.style.display = "none";
      signupScreen.style.display = "none";
      loginScreen.style.display = "none";
      document.getElementById("home-screen").style.display = "block";
      displayEmailInput.value = user.email;

      db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          displayNameInput.value = doc.data().name || "";
        }
      });
    } else {
      authChoiceScreen.style.display = "flex";
      signupScreen.style.display = "none";
      loginScreen.style.display = "none";
      document.getElementById("home-screen").style.display = "none";
    }
  });
});
