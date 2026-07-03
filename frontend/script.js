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

// Profile form
const form = document.getElementById("profileForm");

// popup function
function showPopup(message) {
    alert(message);
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const interests = [...document.querySelectorAll('input[name="interests"]:checked')]
        .map(i => i.value);

    const profile = {
        name: document.getElementById("name").value,
        age: document.getElementById("age").value,
        school: document.getElementById("school").value,
        bio: document.getElementById("bio").value,
        interests: interests
    };

    try {
        const response = await fetch(
            "https://n8ngc.codeblazar.org/webhook-test/save-profile",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(profile)
            }
        );

        const text = await response.text();
        console.log("RAW RESPONSE:", text);

        let data = {};

        try {
            data = JSON.parse(text);
        } catch (err) {
            // fallback if backend returns plain text
            data = { message: text };
        }
        if (response.ok) {
            showPopup(data.message || "Profile saved successfully! 🎉");
            window.location.href = "chat.html";
        } else {
            showPopup(data.message || "Failed to save profile. Please try again.");
        }

    } catch (error) {
        console.error(error);
        showPopup("Network error. Please check your connection.");
    }
});

// Show pop up message
function showPopup(message) {
    document.getElementById("popupMessage").textContent = message;
    document.getElementById("popup").classList.remove("hidden");
}

function closePopup() {
    document.getElementById("popup").classList.add("hidden");
}