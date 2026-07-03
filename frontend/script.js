// Profile icon on header
document.addEventListener("DOMContentLoaded", () => {

    const avatarBtn = document.getElementById("avatarBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutOpt = document.getElementById("logoutOpt");

    if (avatarBtn && dropdownMenu) {
        avatarBtn.addEventListener("click", (event) => {
            event.stopPropagation();

            const isExpanded = avatarBtn.getAttribute("aria-expanded") === "true";
            avatarBtn.setAttribute("aria-expanded", !isExpanded);

            dropdownMenu.classList.toggle("show");
        });
    }

    if (logoutOpt) {
        logoutOpt.addEventListener("click", (event) => {
            event.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = "login.html";
            }
        });
    }

});

// Profile webhook javascript
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("profileForm");

    // safety check (prevents your addEventListener crash)
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Get selected interests
        const interests = Array.from(
            document.querySelectorAll('input[name="interests"]:checked')
        ).map(cb => cb.value);

        // Build profile object
        const profile = {
            userId: "temp001",
            name: document.getElementById("name").value.trim(),
            age: Number(document.getElementById("age").value),
            school: document.getElementById("school").value.trim(),
            bio: document.getElementById("bio").value.trim(),
            interests
        };

        console.log("Sending profile:", profile);

        try {
            const response = await fetch(
                "https://n8ngc.codeblazar.org/webhook/save-profile",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(profile)
                }
            );

            const rawText = await response.text();
            console.log("Raw Response:", rawText);

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (err) {
                alert("Server returned invalid response. Check console.");
                return;
            }

            if (!response.ok) {
                throw new Error(data?.message || `HTTP ${response.status}`);
            }

            // ✅ SUCCESS FLOW (THIS IS WHAT YOU WERE MISSING)
            if (data?.success) {
                alert("Profile saved successfully!");

                // 🔥 SAVE TO LOCAL STORAGE (IMPORTANT FIX)
                localStorage.setItem("name", profile.name);
                localStorage.setItem("age", profile.age);
                localStorage.setItem("school", profile.school);
                localStorage.setItem("bio", profile.bio);
                localStorage.setItem("interests", JSON.stringify(profile.interests));

                // 🔥 OPTIONAL: go to chat page
                window.location.href = "chat.html";

            } else {
                alert(data?.message || "Profile saved but failed status returned.");
            }

        } catch (error) {
            console.error("Save Profile Error:", error);
            alert("Failed to save profile.");
        }
    });
});

// BotPress chatbot
window.addEventListener('load', function () {
      function mountInline() {
        try {
          if (window.botpress.fabIframe) window.botpress.fabIframe.remove();
          if (window.botpress.webchatIframe) window.botpress.webchatIframe.remove();
          window.botpress.initialized = false;
          window.botpress.init({
            ...window.botpress,
            configuration: {
              ...window.botpress.configuration,
              color: '#C96442',
              variant: 'soft',
              themeMode: 'light',
              radius: 2,
              fontFamily: 'Inter',
            },
            selector: '#chat-mount',
          });
          window.botpress.on('webchat:ready', function () {
            window.botpress.open();
          });
        } catch (err) {
          console.error('Could not mount Botpress inline:', err);
        }
      }

      // Poll briefly for window.botpress since the generated script is deferred
      var tries = 0;
      var waitForBotpress = setInterval(function () {
        tries++;
        if (window.botpress && window.botpress.initialized) {
          clearInterval(waitForBotpress);
          mountInline();
        } else if (tries > 40) {
          clearInterval(waitForBotpress);
          console.error('Botpress did not initialize in time.');
        }
      }, 250);
    });

// Find friends
async function findFriends() {

    const interests = JSON.parse(localStorage.getItem("interests") || "[]");

    const userProfile = {
        name: localStorage.getItem("name") || "Guest",
        age: Number(localStorage.getItem("age")) || 21,
        school: localStorage.getItem("school") || "Unknown",
        bio: localStorage.getItem("bio") || "",
        interests: interests
    };

    console.log("Sending:", userProfile);

    try {
        const response = await fetch("https://n8ngc.codeblazar.org/webhook/find-friends", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userProfile)
        });

        const data = await response.json();

        console.log("RESPONSE FROM N8N:", data);

        if (!data || !data.matches) {
            console.error("No matches returned");
            return;
        }

        displayMatches(data.matches);

    } catch (error) {
        console.error("Error fetching matches:", error);
    }
}

// Display matches
function displayMatches(matches) {
    const container = document.getElementById("matches");

    if (!container) {
        console.error("Missing #matches div in HTML");
        return;
    }

    if (!matches || matches.length === 0) {
        container.innerHTML = "<p>No matches found 😢</p>";
        return;
    }

    container.innerHTML = matches.map(user => `
        <div class="card">
            <h3>${user.name || "Unknown"}</h3>
            <p>Age: ${user.age ?? "N/A"}</p>
            <p>School: ${user.school ?? "N/A"}</p>
            <p>Score: ${user.score ?? 0}</p>
        </div>
    `).join("");
}