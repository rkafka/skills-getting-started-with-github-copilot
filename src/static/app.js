document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageBox = document.getElementById("message");

  function showMessage(type, text) {
    messageBox.className = `message ${type}`;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    setTimeout(() => messageBox.classList.add("hidden"), 4000);
  }

  async function loadActivities() {
    try {
      const res = await fetch("/activities");
      const activities = await res.json();
      renderActivities(activities);
      populateSelect(Object.keys(activities));
    } catch (err) {
      activitiesList.innerHTML =
        "<p class='error'>Failed to load activities. Try again later.</p>";
    }
  }

  function populateSelect(names) {
    // Clear old options except placeholder
    activitySelect.querySelectorAll("option:not([value=''])").forEach(o => o.remove());
    names.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    Object.entries(activities).forEach(([name, data]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.setAttribute("data-activity-name", name);

      card.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p class="description">${escapeHtml(data.description)}</p>
        <p class="schedule"><strong>Schedule:</strong> ${escapeHtml(data.schedule)}</p>
        <p class="spots"><strong>Participants:</strong> ${data.participants.length} / ${data.max_participants}</p>
        <div class="participants-section">
          <h5>Participants</h5>
          <ul class="participants-list">${renderParticipants(data.participants)}</ul>
        </div>
      `;
      activitiesList.appendChild(card);
    });
  }

  function renderParticipants(list) {
    if (!list || list.length === 0) {
      return `<li class="no-participants">No participants yet</li>`;
    }
    return list
      .map(email => `<li class="participant-item">${escapeHtml(email)}</li>`)
      .join("");
  }

  async function submitSignup(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activity = activitySelect.value;
    if (!email || !activity) {
      showMessage("error", "Please provide your email and select an activity.");
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Signup failed");
      }
      showMessage("success", `Signed up ${email} for ${activity}`);
      signupForm.reset();
      await loadActivities(); // refresh participants lists
    } catch (err) {
      showMessage("error", err.message || "Signup failed");
    }
  }

  // Simple HTML escape to avoid accidental injection
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  signupForm.addEventListener("submit", submitSignup);
  loadActivities();
});
