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
      // Prevent cached responses so UI reflects latest changes immediately
      const res = await fetch(`/activities?_=${Date.now()}`, { cache: "no-store" });
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
      .map(email => `
        <li class="participant-item">
          <span class="participant-email">${escapeHtml(email)}</span>
          <button class="remove-participant" data-email="${escapeHtml(email)}" aria-label="Remove ${escapeHtml(email)}">&times;</button>
        </li>`)
      .join("");
  }

  // Append a participant to the activity card in the DOM (optimistic UI update)
  function appendParticipantToActivityCard(activityName, email) {
    const cards = Array.from(document.querySelectorAll('.activity-card'));
    const card = cards.find(c => c.getAttribute('data-activity-name') === activityName);
    if (!card) return;

    const list = card.querySelector('.participants-list');
    if (!list) return;

    // If there was the 'No participants yet' placeholder, remove it
    const placeholder = list.querySelector('.no-participants');
    if (placeholder) placeholder.remove();

    // Create participant list item
    const li = document.createElement('li');
    li.className = 'participant-item';
    li.innerHTML = `
      <span class="participant-email">${escapeHtml(email)}</span>
      <button class="remove-participant" data-email="${escapeHtml(email)}" aria-label="Remove ${escapeHtml(email)}">&times;</button>
    `;
    list.appendChild(li);

    // Update spots count (increment the current number)
    const spots = card.querySelector('.spots');
    if (spots) {
      // Extract numbers like "Participants: X / Y"
      const text = spots.textContent || '';
      const m = text.match(/(Participants:)?\s*(\d+)\s*\/\s*(\d+)/i);
      if (m) {
        const current = parseInt(m[2], 10);
        const max = m[3];
        spots.innerHTML = `<strong>Participants:</strong> ${current + 1} / ${max}`;
      }
    }
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

      // Optimistically update the UI immediately and then refresh to ensure consistency
      appendParticipantToActivityCard(activity, email);
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

  // Delegate remove-participant button clicks from the activities list
  activitiesList.addEventListener("click", async (e) => {
    if (!e.target.matches || !e.target.matches('.remove-participant')) return;
    const btn = e.target;
    const email = btn.dataset.email;
    const card = btn.closest('.activity-card');
    const activity = card && card.getAttribute('data-activity-name');
    if (!activity || !email) return;
    // Simple confirmation to prevent accidental removals
    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const url = `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Unregister failed");
      }
      showMessage("success", `Unregistered ${email} from ${activity}`);
      await loadActivities(); // refresh participants lists
    } catch (err) {
      showMessage("error", err.message || "Unregister failed");
    }
  });

  signupForm.addEventListener("submit", submitSignup);
  loadActivities();
});
