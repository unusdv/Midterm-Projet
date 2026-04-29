/* =========================================================
   PowerFit Gym - Main JavaScript
   External JS only. No inline scripts. No document.write().
   Handles: navigation toggle, active link highlight,
            back-to-top button, registration form submit,
            and summary table generation on summary.html.
   ========================================================= */

(function () {
    "use strict";

    var STORAGE_KEY = "powerfit_registration_data";

    /* ---------- Helpers ---------- */
    function getCurrentPage() {
        var path = window.location.pathname;
        var page = path.substring(path.lastIndexOf("/") + 1);
        if (page === "" || page === "/") {
            page = "index.html";
        }
        return page.toLowerCase();
    }

    function escapeHTML(value) {
        if (value === null || value === undefined) {
            return "";
        }
        var stringValue = String(value);
        return stringValue
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /* ---------- Navigation ---------- */
    function setupNavigation() {
        var burger = document.querySelector(".ham-burger");
        var nav = document.querySelector(".main-nav");

        if (burger && nav) {
            burger.addEventListener("click", function () {
                burger.classList.toggle("active");
                nav.classList.toggle("open");
            });

            var navLinks = nav.querySelectorAll("a");
            for (var i = 0; i < navLinks.length; i++) {
                navLinks[i].addEventListener("click", function () {
                    burger.classList.remove("active");
                    nav.classList.remove("open");
                });
            }
        }

        // Highlight active link based on current page
        var currentPage = getCurrentPage();
        var allLinks = document.querySelectorAll(".main-nav ul li a");
        for (var j = 0; j < allLinks.length; j++) {
            var href = allLinks[j].getAttribute("href");
            if (href && href.toLowerCase() === currentPage) {
                allLinks[j].classList.add("active");
            }
        }
    }

    /* ---------- Back to Top ---------- */
    function setupBackToTop() {
        var btn = document.querySelector(".back-to-top");
        if (!btn) {
            return;
        }

        function toggleVisibility() {
            if (window.scrollY > 300) {
                btn.classList.add("visible");
            } else {
                btn.classList.remove("visible");
            }
        }

        window.addEventListener("scroll", toggleVisibility);
        toggleVisibility();

        btn.addEventListener("click", function (event) {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    /* ---------- Field Label Mapping ---------- */
    var FIELD_LABELS = {
        fullName: "Full Name",
        email: "Email Address",
        age: "Age",
        phone: "Phone Number",
        gender: "Gender",
        goals: "Fitness Goals",
        plan: "Membership Plan",
        startDate: "Preferred Start Date",
        notes: "Additional Notes"
    };

    var PLAN_DETAILS = {
        basic: "Basic Plan ($29/Month)",
        standard: "Standard Plan ($49/Month)",
        premium: "Premium Plan ($79/Month)",
        elite: "Elite Plan ($99/Month)"
    };

    /* ---------- Registration Form ---------- */
    function setupRegistrationForm() {
        var form = document.getElementById("registration-form");
        if (!form) {
            return;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            // Collect text-style fields
            var data = {};
            data.fullName = (form.elements.fullName.value || "").trim();
            data.email = (form.elements.email.value || "").trim();
            data.age = (form.elements.age.value || "").trim();
            data.phone = (form.elements.phone.value || "").trim();
            data.notes = (form.elements.notes.value || "").trim();
            data.startDate = (form.elements.startDate.value || "").trim();

            // Gender (radio)
            var genderRadios = form.querySelectorAll('input[name="gender"]');
            data.gender = "";
            for (var g = 0; g < genderRadios.length; g++) {
                if (genderRadios[g].checked) {
                    data.gender = genderRadios[g].value;
                    break;
                }
            }

            // Fitness goals (checkboxes -> array)
            var goalBoxes = form.querySelectorAll('input[name="goals"]');
            var selectedGoals = [];
            for (var c = 0; c < goalBoxes.length; c++) {
                if (goalBoxes[c].checked) {
                    selectedGoals.push(goalBoxes[c].value);
                }
            }
            data.goals = selectedGoals.join(", ");

            // Plan (select dropdown) - resolve friendly label
            var planValue = form.elements.plan.value || "";
            if (planValue && PLAN_DETAILS.hasOwnProperty(planValue)) {
                data.plan = PLAN_DETAILS[planValue];
            } else {
                data.plan = planValue;
            }

            // Validation using loops + conditionals
            var errors = [];
            var requiredFields = ["fullName", "email", "age", "gender", "plan"];
            for (var r = 0; r < requiredFields.length; r++) {
                var key = requiredFields[r];
                if (!data[key]) {
                    errors.push(FIELD_LABELS[key] + " is required.");
                }
            }

            if (data.email && data.email.indexOf("@") === -1) {
                errors.push("Please enter a valid email address.");
            }

            if (data.age) {
                var ageNum = parseInt(data.age, 10);
                if (isNaN(ageNum) || ageNum < 12 || ageNum > 100) {
                    errors.push("Age must be a number between 12 and 100.");
                }
            }

            var errorBox = document.getElementById("form-errors");
            if (errors.length > 0) {
                if (errorBox) {
                    errorBox.innerHTML = "";
                    var ul = document.createElement("ul");
                    for (var e = 0; e < errors.length; e++) {
                        var li = document.createElement("li");
                        li.textContent = errors[e];
                        ul.appendChild(li);
                    }
                    errorBox.appendChild(ul);
                    errorBox.style.display = "block";
                }
                return;
            }

            if (errorBox) {
                errorBox.style.display = "none";
                errorBox.innerHTML = "";
            }

            // Persist to sessionStorage so summary.html can read it.
            // (sessionStorage is widely supported by all GitHub-Pages-served browsers.)
            try {
                window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (storageError) {
                // If storage fails, fallback to a global variable on window
                window.__powerfitData = data;
            }

            // Redirect to the summary page
            window.location.href = "summary.html";
        });
    }

    /* ---------- Summary Page ---------- */
    function renderSummary() {
        var tableBody = document.getElementById("summary-body");
        var emptyMsg = document.getElementById("summary-empty");
        if (!tableBody) {
            return;
        }

        var data = null;
        try {
            var raw = window.sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                data = JSON.parse(raw);
            }
        } catch (err) {
            data = null;
        }

        if (!data && window.__powerfitData) {
            data = window.__powerfitData;
        }

        if (!data) {
            if (emptyMsg) {
                emptyMsg.style.display = "block";
            }
            tableBody.innerHTML = "";
            return;
        }

        if (emptyMsg) {
            emptyMsg.style.display = "none";
        }

        // Display order
        var displayOrder = [
            "fullName",
            "email",
            "phone",
            "age",
            "gender",
            "goals",
            "plan",
            "startDate",
            "notes"
        ];

        // Clear out existing rows then build using DOM methods
        tableBody.innerHTML = "";
        for (var i = 0; i < displayOrder.length; i++) {
            var fieldKey = displayOrder[i];
            var label = FIELD_LABELS[fieldKey] || fieldKey;
            var value = data[fieldKey];

            if (value === undefined || value === null || value === "") {
                value = "—";
            }

            var row = document.createElement("tr");

            var fieldCell = document.createElement("td");
            fieldCell.textContent = label;
            fieldCell.style.fontWeight = "600";

            var valueCell = document.createElement("td");
            valueCell.textContent = value;

            row.appendChild(fieldCell);
            row.appendChild(valueCell);
            tableBody.appendChild(row);
        }

        // Hook up clear button
        var clearBtn = document.getElementById("clear-summary");
        if (clearBtn) {
            clearBtn.addEventListener("click", function (event) {
                event.preventDefault();
                try {
                    window.sessionStorage.removeItem(STORAGE_KEY);
                } catch (err) { /* ignore */ }
                window.__powerfitData = null;
                tableBody.innerHTML = "";
                if (emptyMsg) {
                    emptyMsg.style.display = "block";
                }
            });
        }
    }

    /* ---------- Init ---------- */
    document.addEventListener("DOMContentLoaded", function () {
        setupNavigation();
        setupBackToTop();
        setupRegistrationForm();
        renderSummary();
    });

    // Expose escapeHTML for any future inline use (kept private otherwise)
    window.PowerFit = { escapeHTML: escapeHTML };
})();
