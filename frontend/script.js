// Profile icon on header
document.addEventListener('DOMContentLoaded', () => {
    const avatarBtn = document.getElementById('avatarBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutOpt = document.getElementById('logoutOpt');

    // 1. Toggle dropdown menu when clicking the Avatar button
    avatarBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevents immediate close from event bubbling
        const isExpanded = avatarBtn.getAttribute('aria-expanded') === 'true';

        avatarBtn.setAttribute('aria-expanded', !isExpanded);
        dropdownMenu.classList.toggle('show');
    });

    // 2. Automatically close dropdown if user clicks anywhere else outside
    document.addEventListener('click', (event) => {
        if (!avatarBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
            avatarBtn.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('show');
        }
    });

    // 3. Keep Logout clickable with a confirmation check
    logoutOpt.addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "login.html"; // Redirect target route
        }
    });
});

// Profile webhook javascript
const form = document.getElementById("profileForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get all selected interests
    const interests = [];

    document.querySelectorAll('input[name="interests"]:checked')
        .forEach((checkbox) => {
            interests.push(checkbox.value);
        });

    // Create profile object
    const profile = {
        name: document.getElementById("name").value,
        age: Number(document.getElementById("age").value),
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

        const result = await response.json();

        document.getElementById("statusMessage").textContent =
            result.message;

    } catch (error) {

        console.error(error);

        document.getElementById("statusMessage").textContent =
            "Unable to connect to the server.";

    }

});
