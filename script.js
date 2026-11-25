// Supabase client configuration. The anon key is public; database policies protect the data.
const SUPABASE_URL = "https://sltqzxsprolaxgcqgbjx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdHF6eHNwcm9sYXhnY3FnYmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU1MDA0OTgsImV4cCI6MjExMTA3NjQ5OH0.jkWaL0YQtI8prGCotROxiYU_x7BrMVD05oQljTVrPuU";
const ADMIN_ID = "prakanda";
const ADMIN_EMAIL = "335849874+prakanda-paudel@users.noreply.github.com";
const ACCOUNT_EMAIL_DOMAIN = "pasteboard.invalid";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const themeToggle = document.querySelector("#theme-toggle");
const accountToggle = document.querySelector("#account-toggle");
const accountPanel = document.querySelector("#account-panel");
const navTabs = [...document.querySelectorAll(".nav-tab")];
const views = [...document.querySelectorAll(".view")];
const authForm = document.querySelector("#auth-form");
const accountUsernameInput = document.querySelector("#account-username");
const accountPasswordInput = document.querySelector("#account-password");
const authSubmitButton = document.querySelector("#auth-submit");
const authModeToggle = document.querySelector("#auth-mode-toggle");
const authCheckApprovalButton = document.querySelector("#auth-check-approval");
const authLogoutButton = document.querySelector("#auth-logout");
const authStatus = document.querySelector("#auth-status");
const adminTools = document.querySelector("#admin-tools");
const approvalStatus = document.querySelector("#approval-status");
const pendingList = document.querySelector("#pending-list");
const allUsersList = document.querySelector("#all-users-list");
const allUsersStatus = document.querySelector("#all-users-status");
const refreshApprovalsButton = document.querySelector("#refresh-approvals");
const projectForm = document.querySelector("#project-form");
const projectList = document.querySelector("#project-list");
const projectStatus = document.querySelector("#projects-status");
const projectFormStatus = document.querySelector("#project-form-status");
const ideaForm = document.querySelector("#idea-form");
const ideaTextInput = document.querySelector("#idea-text");
const ideaCount = document.querySelector("#idea-count");
const ideaList = document.querySelector("#idea-list");
const ideasStatus = document.querySelector("#ideas-status");
const ideaFormStatus = document.querySelector("#idea-form-status");
const pollForm = document.querySelector("#poll-form");
const pollQuestionInput = document.querySelector("#poll-question");
const pollOptionInputs = document.querySelector("#poll-option-inputs");
const addOptionButton = document.querySelector("#add-option");
const pollList = document.querySelector("#poll-list");
const pollsStatus = document.querySelector("#polls-status");
const pollFormStatus = document.querySelector("#poll-form-status");
const pasteLocked = document.querySelector("#paste-locked");
const pasteContentArea = document.querySelector("#paste-content-area");
const pasteForm = document.querySelector("#paste-form");
const pasteTitleInput = document.querySelector("#paste-title");
const pasteInput = document.querySelector("#paste-input");
const pasteList = document.querySelector("#paste-list");
const pasteStatus = document.querySelector("#paste-status");
const pasteFormStatus = document.querySelector("#paste-form-status");

let currentUserId = null;
let isAdmin = false;
let isApproved = false;
let isSignUpMode = false;
let activeView = "home";
let pollLoadInProgress = false;
let activeGameId = null;
let manuallySelectedGameId = null;
let knownGameStatuses = new Map();
let gameRefreshTimer = null;
let scoreboardRefreshTimer = null;

// Show all content as text, never as parsed markup.
function setMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function emptyState(message) {
  const element = document.createElement("p");
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function safeWebUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

// Respect the system appearance until the visitor chooses a saved override.
function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("hub-theme", theme);
  } else {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem("hub-theme");
  }
  const activeTheme = theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
  themeToggle.title = `Switch to ${nextTheme} mode`;
}

const savedTheme = localStorage.getItem("hub-theme");
applyTheme(savedTheme === "light" || savedTheme === "dark" ? savedTheme : null);
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(current === "dark" ? "light" : "dark");
});

// Change sections without a page reload.
function showView(name) {
  activeView = name;
  views.forEach((view) => { view.hidden = view.id !== `view-${name}`; });
  navTabs.forEach((tab) => {
    const selected = tab.dataset.view === name;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  if (name === "projects") loadProjects();
  if (name === "ideas") loadIdeas();
  if (name === "polls") loadPolls();
  if (name === "paste" && (isAdmin || isApproved)) loadPastes();
  if (name === "games") loadGamesView();
}
navTabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
document.querySelectorAll("[data-go-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.goView)));
document.querySelector("[data-home-link]").addEventListener("click", (event) => {
  event.preventDefault();
  showView("home");
});

// Open account tools only when requested, with keyboard-friendly close behavior.
function setAccountPanelOpen(open) {
  accountPanel.hidden = !open;
  accountToggle.setAttribute("aria-expanded", String(open));
  accountToggle.setAttribute("aria-label", open ? "Close account panel" : "Open account panel");
  accountToggle.title = open ? "Close account panel" : "Account";
  if (open) (currentUserId ? authLogoutButton : accountUsernameInput).focus();
}
accountToggle.addEventListener("click", () => setAccountPanelOpen(accountPanel.hidden));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !accountPanel.hidden) {
    setAccountPanelOpen(false);
    accountToggle.focus();
  }
});
document.querySelectorAll("[data-open-account]").forEach((button) => button.addEventListener("click", () => setAccountPanelOpen(true)));

function usernameToEmail(username) {
  return username === ADMIN_ID ? ADMIN_EMAIL : `${username}@${ACCOUNT_EMAIL_DOMAIN}`;
}

function updateAuthControls() {
  const signedIn = Boolean(currentUserId);
  accountUsernameInput.disabled = signedIn;
  accountPasswordInput.disabled = signedIn;
  authSubmitButton.hidden = signedIn;
  authModeToggle.hidden = signedIn;
  authCheckApprovalButton.hidden = !signedIn || isApproved || isAdmin;
  authLogoutButton.hidden = !signedIn;
  authSubmitButton.textContent = isSignUpMode ? "Request account" : "Log in";
  authModeToggle.textContent = isSignUpMode ? "Back to log in" : "Request an account";
  accountPasswordInput.autocomplete = isSignUpMode ? "new-password" : "current-password";
  adminTools.hidden = !isAdmin;
  pasteLocked.hidden = isAdmin || isApproved;
  pasteContentArea.hidden = !(isAdmin || isApproved);
}

// Projects are public, newest first.
async function loadProjects() {
  setMessage(projectStatus, "Loading projects...");
  const { data, error } = await supabaseClient.from("projects")
    .select("id, title, description, status, tags, link, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    setMessage(projectStatus, "Couldn’t load projects. Try refreshing.", true);
    if (!projectList.childElementCount) projectList.replaceChildren(emptyState("Projects are temporarily unavailable."));
    return;
  }
  projectList.replaceChildren();
  if (!data.length) projectList.append(emptyState("No projects yet. Add the first one."));
  data.forEach((project) => projectList.append(projectCard(project)));
  setMessage(projectStatus, `${data.length} project${data.length === 1 ? "" : "s"}`);
}

function projectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";
  const top = document.createElement("div");
  top.className = "project-card-top";
  const title = document.createElement("h2");
  title.textContent = project.title;
  const status = document.createElement("span");
  const statusClass = project.status === "In progress" ? "progress" : project.status.toLowerCase();
  status.className = `status-chip status-${statusClass}`;
  status.textContent = project.status;
  top.append(title, status);
  const description = document.createElement("p");
  description.className = "project-description";
  description.textContent = project.description;
  card.append(top, description);
  if (Array.isArray(project.tags) && project.tags.length) {
    const tags = document.createElement("div");
    tags.className = "tag-list";
    project.tags.forEach((value) => {
      const tag = document.createElement("span");
      tag.className = "tag-chip";
      tag.textContent = value;
      tags.append(tag);
    });
    card.append(tags);
  }
  if (isAdmin) {
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete project “${project.title}”?`)) return;
      remove.disabled = true;
      const { error } = await supabaseClient.rpc("delete_hub_project", { project_id: project.id });
      if (error) {
        setMessage(projectStatus, "Couldn’t delete that project.", true);
        remove.disabled = false;
        return;
      }
      await loadProjects();
    });
    card.append(remove);
  }
  const linkUrl = safeWebUrl(project.link);
  if (linkUrl) {
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = linkUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open project ↗";
    card.append(link);
  }
  return card;
}

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.querySelector("#project-title").value.trim();
  const description = document.querySelector("#project-description").value.trim();
  const status = document.querySelector("#project-status").value;
  const tags = document.querySelector("#project-tags").value.split(",").map((tag) => tag.trim().slice(0, 24)).filter(Boolean).slice(0, 8);
  const rawLink = document.querySelector("#project-link").value.trim();
  const link = safeWebUrl(rawLink);
  if (rawLink && !link) {
    setMessage(projectFormStatus, "Use a valid http or https link.", true);
    return;
  }
  const submit = projectForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setMessage(projectFormStatus, "Saving project...");
  const { error } = await supabaseClient.from("projects").insert({ title, description, status, tags, link });
  submit.disabled = false;
  if (error) {
    setMessage(projectFormStatus, "Couldn’t save the project. Please try again.", true);
    return;
  }
  projectForm.reset();
  setMessage(projectFormStatus, "Project added.");
  await loadProjects();
});

// Ideas are public and each post is limited to 500 characters.
async function loadIdeas() {
  setMessage(ideasStatus, "Loading ideas...");
  const { data, error } = await supabaseClient.from("ideas").select("id, content, created_at").order("created_at", { ascending: false });
  if (error) {
    setMessage(ideasStatus, "Couldn’t load ideas. Try refreshing.", true);
    if (!ideaList.childElementCount) ideaList.replaceChildren(emptyState("Ideas are temporarily unavailable."));
    return;
  }
  ideaList.replaceChildren();
  if (!data.length) ideaList.append(emptyState("No ideas yet. Be the first to share one."));
  data.forEach((idea) => {
    const card = document.createElement("article");
    card.className = "idea-card";
    const text = document.createElement("p");
    text.textContent = idea.content;
    const time = document.createElement("time");
    time.dateTime = idea.created_at;
    time.textContent = formatDate(idea.created_at);
    card.append(text, time);
    if (isAdmin) {
      const remove = document.createElement("button");
      remove.className = "delete-button";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm("Delete this idea?")) return;
        remove.disabled = true;
        const { error } = await supabaseClient.rpc("delete_hub_idea", { idea_id: idea.id });
        if (error) {
          setMessage(ideasStatus, "Couldn’t delete that idea.", true);
          remove.disabled = false;
          return;
        }
        await loadIdeas();
      });
      card.append(remove);
    }
    ideaList.append(card);
  });
  setMessage(ideasStatus, `${data.length} idea${data.length === 1 ? "" : "s"}`);
}

ideaTextInput.addEventListener("input", () => { ideaCount.textContent = `${ideaTextInput.value.length} / 500`; });
ideaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = ideaTextInput.value.trim();
  if (!content || content.length > 500) return;
  const submit = ideaForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setMessage(ideaFormStatus, "Posting idea...");
  const { error } = await supabaseClient.from("ideas").insert({ content });
  submit.disabled = false;
  if (error) {
    setMessage(ideaFormStatus, "Couldn’t post that idea. Please try again.", true);
    return;
  }
  ideaForm.reset();
  ideaCount.textContent = "0 / 500";
  setMessage(ideaFormStatus, "Idea posted.");
  await loadIdeas();
});

// Let poll creators add or remove options while keeping the count between two and six.
function updateOptionControls() {
  const rows = [...pollOptionInputs.querySelectorAll(".poll-option-input-row")];
  addOptionButton.disabled = rows.length >= 6;
  rows.forEach((row, index) => {
    row.querySelector("input").setAttribute("aria-label", `Poll option ${index + 1}`);
    row.querySelector(".remove-option").disabled = rows.length <= 2;
  });
}
function addPollOption(value = "") {
  const row = document.createElement("div");
  row.className = "poll-option-input-row";
  const input = document.createElement("input");
  input.type = "text";
  input.name = "option";
  input.maxLength = 100;
  input.required = true;
  input.placeholder = `Option ${pollOptionInputs.children.length + 1}`;
  input.value = value;
  const remove = document.createElement("button");
  remove.className = "remove-option";
  remove.type = "button";
  remove.setAttribute("aria-label", "Remove option");
  remove.textContent = "−";
  remove.addEventListener("click", () => {
    if (pollOptionInputs.children.length <= 2) return;
    row.remove();
    updateOptionControls();
  });
  row.append(input, remove);
  pollOptionInputs.append(row);
  updateOptionControls();
}
addPollOption("Yes");
addPollOption("No");
addOptionButton.addEventListener("click", () => { if (pollOptionInputs.children.length < 6) addPollOption(); });

// Refresh poll questions, choices, and vote totals every ten seconds.
async function loadPolls() {
  if (pollLoadInProgress) return;
  pollLoadInProgress = true;
  setMessage(pollsStatus, "Loading polls...");
  const [polls, options, votes] = await Promise.all([
    supabaseClient.from("polls").select("id, question, created_at").order("created_at", { ascending: false }),
    supabaseClient.from("poll_options").select("id, poll_id, text, position").order("position", { ascending: true }),
    supabaseClient.from("votes").select("id, option_id")
  ]);
  pollLoadInProgress = false;
  if (polls.error || options.error || votes.error) {
    setMessage(pollsStatus, "Couldn’t load polls. Please refresh the page.", true);
    if (!pollList.childElementCount) pollList.replaceChildren(emptyState("Polls are temporarily unavailable."));
    return;
  }
  const optionsByPoll = new Map();
  options.data.forEach((option) => {
    if (!optionsByPoll.has(option.poll_id)) optionsByPoll.set(option.poll_id, []);
    optionsByPoll.get(option.poll_id).push(option);
  });
  const counts = new Map();
  votes.data.forEach((vote) => counts.set(vote.option_id, (counts.get(vote.option_id) || 0) + 1));
  pollList.replaceChildren();
  if (!polls.data.length) pollList.append(emptyState("No polls yet. Create the first one."));
  else {
    polls.data.forEach((poll) => {
      const pollOptions = optionsByPoll.get(poll.id) || [];
      if (pollOptions.length) pollList.append(createPollCard(poll, pollOptions, counts));
    });
    if (!pollList.childElementCount) pollList.append(emptyState("No polls yet. Create the first one."));
  }
  setMessage(pollsStatus, `${polls.data.length} poll${polls.data.length === 1 ? "" : "s"} · updates every 10 seconds`);
}

function createPollCard(poll, options, counts) {
  const card = document.createElement("article");
  card.className = "poll-card";
  const heading = document.createElement("div");
  heading.className = "poll-card-header";
  const question = document.createElement("h2");
  question.textContent = poll.question;
  const time = document.createElement("time");
  time.dateTime = poll.created_at;
  time.textContent = formatDate(poll.created_at);
  heading.append(question, time);
  if (isAdmin) {
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "Delete poll";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete poll “${poll.question}” and all of its votes?`)) return;
      remove.disabled = true;
      const { error } = await supabaseClient.rpc("delete_hub_poll", { poll_id: poll.id });
      if (error) {
        setMessage(pollsStatus, "Couldn’t delete that poll.", true);
        remove.disabled = false;
        return;
      }
      await loadPolls();
    });
    heading.append(remove);
  }
  const choiceList = document.createElement("div");
  choiceList.className = "poll-options";
  const totalVotes = options.reduce((total, option) => total + (counts.get(option.id) || 0), 0);
  const savedVote = localStorage.getItem(`hub-vote-${poll.id}`);
  options.forEach((option) => {
    const count = counts.get(option.id) || 0;
    const percentage = totalVotes ? Math.round(count / totalVotes * 100) : 0;
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = `poll-choice${savedVote === String(option.id) ? " is-selected" : ""}`;
    choice.disabled = Boolean(savedVote);
    choice.setAttribute("aria-label", `${option.text}, ${count} votes, ${percentage}%`);
    const line = document.createElement("span");
    line.className = "poll-choice-label";
    const label = document.createElement("strong");
    label.textContent = option.text;
    const result = document.createElement("span");
    result.className = "poll-vote-count";
    result.textContent = `${count} · ${percentage}%`;
    line.append(label, result);
    const bar = document.createElement("span");
    bar.className = "poll-bar";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", String(percentage));
    const fill = document.createElement("span");
    fill.className = "poll-bar-fill";
    fill.style.setProperty("--vote-width", `${percentage}%`);
    bar.append(fill);
    choice.append(line, bar);
    choice.addEventListener("click", () => submitVote(poll.id, option.id));
    choiceList.append(choice);
  });
  const footer = document.createElement("div");
  footer.className = "poll-footer";
  const total = document.createElement("span");
  total.textContent = `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`;
  const note = document.createElement("span");
  note.textContent = savedVote ? "Your vote is saved in this browser" : "One vote per browser";
  footer.append(total, note);
  card.append(heading, choiceList, footer);
  return card;
}

async function submitVote(pollId, optionId) {
  const key = `hub-vote-${pollId}`;
  if (localStorage.getItem(key)) return;
  setMessage(pollsStatus, "Saving your vote...");
  const { error } = await supabaseClient.from("votes").insert({ option_id: optionId });
  if (error) {
    setMessage(pollsStatus, "Couldn’t save your vote. Please try again.", true);
    return;
  }
  localStorage.setItem(key, String(optionId));
  await loadPolls();
}

pollForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = pollQuestionInput.value.trim();
  const options = [...pollOptionInputs.querySelectorAll("input[name='option']")].map((input) => input.value.trim()).filter(Boolean);
  if (!question || question.length > 200 || options.length < 2 || options.length > 6 || options.some((option) => option.length > 100)) {
    setMessage(pollFormStatus, "Add a question and 2–6 options (100 characters max each).", true);
    return;
  }
  const submit = pollForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setMessage(pollFormStatus, "Publishing poll...");
  const { data: poll, error: pollError } = await supabaseClient.from("polls").insert({ question }).select("id").single();
  if (pollError) {
    setMessage(pollFormStatus, "Couldn’t create the poll. Please try again.", true);
    submit.disabled = false;
    return;
  }
  const rows = options.map((text, index) => ({ poll_id: poll.id, text, position: index + 1 }));
  const { error: optionError } = await supabaseClient.from("poll_options").insert(rows);
  submit.disabled = false;
  if (optionError) {
    setMessage(pollFormStatus, "The poll exists, but its options could not be saved. Please contact the Hub admin.", true);
    return;
  }
  pollForm.reset();
  pollOptionInputs.replaceChildren();
  addPollOption("Yes");
  addPollOption("No");
  setMessage(pollFormStatus, "Poll published.");
  await loadPolls();
});

// Pastes stay private to approved members/admins, using the existing table and policies.
async function loadPastes() {
  if (!currentUserId || (!isApproved && !isAdmin)) return;
  setMessage(pasteStatus, "Loading pastes...");
  const { data, error } = await supabaseClient.from("pastes").select("id, title, content, created_at, owner_id").order("created_at", { ascending: false });
  if (error) {
    setMessage(pasteStatus, "Couldn’t load pastes. Please try again.", true);
    pasteList.replaceChildren(emptyState("Pastes are temporarily unavailable."));
    return;
  }
  pasteList.replaceChildren();
  if (!data.length) pasteList.append(emptyState("No pastes yet. Share the first one."));
  data.forEach((paste) => pasteList.append(createPasteCard(paste)));
  setMessage(pasteStatus, `${data.length} paste${data.length === 1 ? "" : "s"}`);
}

function createPasteCard(paste) {
  const card = document.createElement("article");
  card.className = "paste-item";
  const metadata = document.createElement("div");
  metadata.className = "paste-meta";
  const time = document.createElement("time");
  time.className = "paste-time";
  time.dateTime = paste.created_at;
  time.textContent = formatDate(paste.created_at);
  const actions = document.createElement("div");
  actions.className = "paste-actions";
  const copy = document.createElement("button");
  copy.className = "copy-button";
  copy.type = "button";
  copy.textContent = "Copy";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(paste.content);
      copy.textContent = "Copied";
      window.setTimeout(() => { copy.textContent = "Copy"; }, 1400);
    } catch {
      copy.textContent = "Copy failed";
      window.setTimeout(() => { copy.textContent = "Copy"; }, 1800);
    }
  });
  actions.append(copy);
  if (isAdmin || paste.owner_id === currentUserId) {
    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm(`Delete “${paste.title || "Untitled paste"}”?`)) return;
      remove.disabled = true;
      const { data, error } = await supabaseClient.from("pastes").delete().eq("id", paste.id).select("id");
      if (error || !data?.length) {
        setMessage(pasteStatus, "Couldn’t delete that paste.", true);
        remove.disabled = false;
        return;
      }
      await loadPastes();
    });
    actions.append(remove);
  }
  const title = document.createElement("h2");
  title.className = "paste-title";
  title.textContent = paste.title || "Untitled paste";
  const body = document.createElement("pre");
  body.className = "paste-content";
  body.textContent = paste.content;
  metadata.append(time, actions);
  card.append(metadata, title, body);
  return card;
}

async function checkAdminRole() {
  const { data, error } = await supabaseClient.rpc("is_pasteboard_admin");
  return !error && data === true;
}
async function checkApprovalStatus() {
  const { data, error } = await supabaseClient.rpc("is_pasteboard_approved");
  return !error && data === true;
}

async function loadAllUsers() {
  if (!isAdmin) return;
  setMessage(allUsersStatus, "Loading accounts...");
  const { data, error } = await supabaseClient.rpc("get_all_pasteboard_users");
  if (error) {
    setMessage(allUsersStatus, "Couldn’t load accounts.", true);
    return;
  }
  allUsersList.replaceChildren();
  if (!data.length) {
    setMessage(allUsersStatus, "No accounts found.");
    return;
  }
  setMessage(allUsersStatus, `${data.length} account${data.length === 1 ? "" : "s"}`);
  data.forEach((member) => {
    const row = document.createElement("li");
    row.className = "pending-user";
    const details = document.createElement("div");
    const username = document.createElement("strong");
    username.className = "pending-user-name";
    username.textContent = member.username;
    const state = document.createElement("time");
    state.className = "pending-user-time";
    state.textContent = member.status === "approved" ? "Approved" : "Pending";
    details.append(username, state);

    const actions = document.createElement("div");
    actions.className = "account-row-actions";
    if (member.username !== ADMIN_ID) {
      const remove = document.createElement("button");
      remove.className = "button button-danger";
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm(`Delete account “${member.username}”? This also removes their notes and approval status.`)) return;
        remove.disabled = true;
        const { error: deleteError } = await supabaseClient.rpc("delete_pasteboard_user", { target_user_id: member.user_id });
        if (deleteError) {
          setMessage(allUsersStatus, "Couldn’t delete that account.", true);
          remove.disabled = false;
          return;
        }
        await Promise.all([loadPendingUsers(), loadAllUsers()]);
      });
      actions.append(remove);
    }
    row.append(details, actions);
    allUsersList.append(row);
  });
}

refreshApprovalsButton.addEventListener("click", async () => {
  await Promise.all([loadPendingUsers(), isAdmin ? loadAllUsers() : Promise.resolve()]);
});

async function loadPendingUsers() {
  if (!isAdmin) return;
  setMessage(approvalStatus, "Loading requests...");
  const { data, error } = await supabaseClient.rpc("get_pending_pasteboard_users");
  if (error) {
    setMessage(approvalStatus, "Couldn’t load approval requests.", true);
    return;
  }
  pendingList.replaceChildren();
  if (!data.length) {
    setMessage(approvalStatus, "No pending accounts.");
    return;
  }
  setMessage(approvalStatus, `${data.length} account request${data.length === 1 ? "" : "s"} waiting.`);
  data.forEach((member) => {
    const row = document.createElement("li");
    row.className = "pending-user";
    const details = document.createElement("div");
    const username = document.createElement("strong");
    username.className = "pending-user-name";
    username.textContent = member.username;
    const time = document.createElement("time");
    time.className = "pending-user-time";
    time.dateTime = member.created_at;
    time.textContent = formatDate(member.created_at);
    const approve = document.createElement("button");
    approve.className = "button button-primary";
    approve.type = "button";
    approve.textContent = "Approve";
    approve.addEventListener("click", async () => {
      approve.disabled = true;
      const { error: approvalError } = await supabaseClient.rpc("approve_pasteboard_user", { target_user_id: member.user_id });
      if (approvalError) {
        setMessage(approvalStatus, "Couldn’t approve that account.", true);
        approve.disabled = false;
        return;
      }
      await Promise.all([loadPendingUsers(), loadAllUsers()]);
    });

    const reject = document.createElement("button");
    reject.className = "button button-danger";
    reject.type = "button";
    reject.textContent = "Reject";
    reject.addEventListener("click", async () => {
      if (!confirm(`Reject account “${member.username}”?`)) return;
      reject.disabled = true;
      const { error: rejectError } = await supabaseClient.rpc("reject_pasteboard_user", { target_user_id: member.user_id });
      if (rejectError) {
        setMessage(approvalStatus, "Couldn’t reject that account.", true);
        reject.disabled = false;
        return;
      }
      await Promise.all([loadPendingUsers(), loadAllUsers()]);
    });

    const actions = document.createElement("div");
    actions.className = "account-row-actions";
    actions.append(approve, reject);
    details.append(username, time);
    row.append(details, actions);
    pendingList.append(row);
  });
}

async function showAuthenticatedUser(user, requestedUsername = "") {
  currentUserId = user.id;
  isAdmin = await checkAdminRole();
  isApproved = isAdmin || await checkApprovalStatus();
  accountUsernameInput.value = isAdmin ? ADMIN_ID : (user.user_metadata?.username || requestedUsername);
  accountPasswordInput.value = "";
  updateAuthControls();
  setAccountPanelOpen(false);
  if (isAdmin) {
    setMessage(authStatus, "Admin signed in.");
    setAccountPanelOpen(false);
    await Promise.all([loadPendingUsers(), loadAllUsers()]);
  } else if (isApproved) {
    setMessage(authStatus, "Account approved. You’re signed in.");
  } else {
    setMessage(authStatus, "Account request received. You can use Paste after the admin approves it.");
  }
  if (isApproved || isAdmin) await loadPastes();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = accountUsernameInput.value.trim().toLowerCase();
  const password = accountPasswordInput.value;
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    setMessage(authStatus, "Use 3–24 letters, numbers, or underscores for your username.", true);
    return;
  }
  if (isSignUpMode && (username === ADMIN_ID || password.length < 8)) {
    setMessage(authStatus, username === ADMIN_ID ? "That username is reserved." : "Choose a password with at least 8 characters.", true);
    return;
  }
  authSubmitButton.disabled = true;
  setMessage(authStatus, isSignUpMode ? "Sending account request..." : "Signing in...");
  const email = usernameToEmail(username);
  if (isSignUpMode) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } });
    accountPasswordInput.value = "";
    if (error) {
      setMessage(authStatus, "Couldn’t create the account. That username may already be used.", true);
      authSubmitButton.disabled = false;
      return;
    }
    if (!data.session) {
      setMessage(authStatus, "Account request created. Log in after the account is ready.");
      authSubmitButton.disabled = false;
      return;
    }
    await showAuthenticatedUser(data.user, username);
  } else {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    accountPasswordInput.value = "";
    if (error) {
      const reason = error.message === "Invalid login credentials"
        ? "The username or password is incorrect."
        : error.message || "Sign-in failed. Please try again.";
      setMessage(authStatus, reason, true);
      authSubmitButton.disabled = false;
      return;
    }
    await showAuthenticatedUser(data.user, username);
  }
  authSubmitButton.disabled = false;
});

authModeToggle.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;
  accountPasswordInput.value = "";
  setMessage(authStatus, isSignUpMode ? "New accounts need admin approval before Paste access." : "Sign in or request an account.");
  updateAuthControls();
});

authCheckApprovalButton.addEventListener("click", async () => {
  authCheckApprovalButton.disabled = true;
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    setMessage(authStatus, "Couldn’t check approval. Please sign in again.", true);
  } else {
    await showAuthenticatedUser(data.user, accountUsernameInput.value);
  }
  authCheckApprovalButton.disabled = false;
});

authLogoutButton.addEventListener("click", async () => {
  authLogoutButton.disabled = true;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    setMessage(authStatus, "Couldn’t sign out. Please try again.", true);
    authLogoutButton.disabled = false;
    return;
  }
  currentUserId = null;
  isAdmin = false;
  isApproved = false;
  isSignUpMode = false;
  pasteList.replaceChildren();
  setMessage(pasteStatus, "Sign in required");
  setMessage(authStatus, "Signed out. Sign in or request an account.");
  updateAuthControls();
  authLogoutButton.disabled = false;
});

pasteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUserId || (!isApproved && !isAdmin)) return;
  const title = pasteTitleInput.value.trim();
  const content = pasteInput.value;
  if (!title || !content.trim()) return;
  const submit = pasteForm.querySelector("button[type='submit']");
  submit.disabled = true;
  setMessage(pasteFormStatus, "Sharing...");
  const { error } = await supabaseClient.from("pastes").insert({ title, content, owner_id: currentUserId });
  submit.disabled = false;
  if (error) {
    setMessage(pasteFormStatus, "Couldn’t share the paste. Please try again.", true);
    return;
  }
  pasteForm.reset();
  setMessage(pasteFormStatus, "Paste shared.");
  await loadPastes();
});

// Public sections work without login; Paste keeps the existing approval gate.
async function refreshPublicSections() {
  await Promise.all([loadProjects(), loadIdeas(), loadPolls()]);
}

async function initializeAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (!data.session || data.session.user.is_anonymous) {
      if (data.session?.user.is_anonymous) await supabaseClient.auth.signOut({ scope: "local" });
      currentUserId = null;
      isAdmin = false;
      isApproved = false;
      updateAuthControls();
      setMessage(pasteStatus, "Sign in required for private pastes.");
      return;
    }
    await showAuthenticatedUser(data.session.user);
  } catch {
    await supabaseClient.auth.signOut({ scope: "local" });
    currentUserId = null;
    isAdmin = false;
    isApproved = false;
    updateAuthControls();
    setMessage(authStatus, "Your saved sign-in expired. Please log in again.");
    setMessage(pasteStatus, "Sign in required for private pastes.");
  }
}

// Tic-Tac-Toe challenges, active games and scoreboard.
function getGameUsername(game) {
  if (!game) return "Player";
  return game.creator_id === currentUserId ? game.creator_username : game.opponent_username || game.creator_username;
}

async function loadGamePart(part) {
  if (part === "challenges") await loadChallenges();
  if (part === "my-game") await loadMyGames();
  if (part === "scoreboard") await loadScoreboard();
}

async function loadChallenges() {
  const status = document.querySelector("#games-status");
  setMessage(status, "Loading challenges...");
  const list = document.querySelector("#challenge-list");
  const challengeButton = document.querySelector("#challenge-button");
  const authMessage = document.querySelector("#game-auth-message");
  const signedIn = Boolean(currentUserId);
  challengeButton.hidden = !signedIn;
  authMessage.textContent = signedIn ? "Create a challenge or accept someone else’s game." : "Log in to play";

  const { data, error } = await supabaseClient
    .from("ttt_games")
    .select("id, creator_id, creator_username, opponent_id, opponent_username, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) {
    setMessage(status, "Couldn’t load challenges. Please try again.", true);
    if (!list.childElementCount) list.replaceChildren(emptyState("Challenges are temporarily unavailable."));
    return;
  }
  list.replaceChildren();
  if (!data.length) {
    list.append(emptyState("No open challenges yet."));
  } else {
    data.forEach((game) => {
      const card = document.createElement("article");
      card.className = "challenge-card";
      const title = document.createElement("h2");
      title.textContent = `Challenge by ${game.creator_username}`;
      const meta = document.createElement("p");
      meta.className = "challenge-meta";
      meta.textContent = `${formatDate(game.created_at)} · Waiting for X/O opponent`;
      card.append(title, meta);

      if (signedIn) {
        const actions = document.createElement("div");
        actions.className = "challenge-actions";
        if (game.creator_id === currentUserId) {
          const cancel = document.createElement("button");
          cancel.className = "button button-quiet";
          cancel.type = "button";
          cancel.textContent = "Cancel";
          cancel.addEventListener("click", async () => {
            cancel.disabled = true;
            const { error: cancelError } = await supabaseClient.rpc("cancel_ttt_challenge", { p_game_id: game.id });
            if (cancelError) {
              setMessage(status, "Couldn’t cancel that challenge.", true);
              cancel.disabled = false;
              return;
            }
            await loadChallenges();
          });
          actions.append(cancel);
        } else {
          const accept = document.createElement("button");
          accept.className = "button button-primary";
          accept.type = "button";
          accept.textContent = "Accept";
          accept.addEventListener("click", async () => {
            accept.disabled = true;
            const { error: acceptError } = await supabaseClient.rpc("accept_ttt_challenge", { p_game_id: game.id });
            if (acceptError) {
              setMessage(status, "Couldn’t accept that challenge.", true);
              accept.disabled = false;
              return;
            }
            activeGameId = game.id;
            manuallySelectedGameId = game.id;
            await loadChallenges();
            await loadMyGames();
            showView("games");
            document.querySelectorAll("[data-game-part]").forEach((item) => {
              const selected = item.dataset.gamePart === "my-game";
              item.classList.toggle("is-active", selected);
              item.setAttribute("aria-selected", String(selected));
            });
            document.querySelectorAll(".game-part").forEach((part) => {
              part.hidden = part.id !== "game-my-game";
            });
          });
          actions.append(accept);
        }
        card.append(actions);
      }
      list.append(card);
    });
  }
  setMessage(status, `${data.length} open challenge${data.length === 1 ? "" : "s"}`);
}

async function createChallenge() {
  if (!currentUserId) return;
  const status = document.querySelector("#games-status");
  setMessage(status, "Creating challenge...");
  const { data, error } = await supabaseClient.rpc("create_ttt_challenge");
  if (error) {
    setMessage(status, "Couldn’t create the challenge.", true);
    return;
  }
  await loadChallenges();
  await loadMyGames();
  if (data) activeGameId = data;
  setMessage(status, "Challenge created. Waiting for an opponent.");
}

async function loadMyGames() {
  const loginRequired = document.querySelector("#game-login-required");
  const myGameContent = document.querySelector("#my-game-content");
  const list = document.querySelector("#active-game-list");
  const signedIn = Boolean(currentUserId);
  loginRequired.hidden = signedIn;
  myGameContent.hidden = !signedIn;
  if (!signedIn) return;

  const { data, error } = await supabaseClient
    .from("ttt_games")
    .select("id, creator_id, creator_username, opponent_id, opponent_username, board, turn, status, winner_id, result, created_at, updated_at")
    .or(`creator_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`)
    .in("status", ["active", "open", "finished"])
    .order("updated_at", { ascending: false });
  if (error) {
    setMessage(document.querySelector("#games-status"), "Couldn’t load your games.", true);
    return;
  }
  list.replaceChildren();
  const relevant = data.filter((game) => game.status !== "cancelled");
  if (!relevant.length) {
    list.append(emptyState("No games yet. Accept or create a challenge."));
    document.querySelector("#ttt-live").hidden = true;
    return;
  }
  relevant.forEach((game) => {
    const card = document.createElement("article");
    card.className = `active-game-card${activeGameId === game.id ? " is-selected" : ""}`;
    const title = document.createElement("h2");
    title.textContent = game.status === "open"
      ? `${game.creator_username} vs waiting opponent`
      : `${game.creator_username} vs ${game.opponent_username || "opponent"}`;
    const meta = document.createElement("p");
    meta.className = "active-game-meta";
    meta.textContent = `${game.status} · ${game.status === "active" ? `${game.turn}'s turn` : game.result ? `Result: ${game.result}` : ""}`;
    card.append(title, meta);
    card.addEventListener("click", () => {
      activeGameId = game.id;
      manuallySelectedGameId = game.id;
      list.querySelectorAll(".active-game-card").forEach((item) => item.classList.remove("is-selected"));
      card.classList.add("is-selected");
      renderGame(game);
    });
    list.append(card);
  });

  const selected = manuallySelectedGameId
    ? relevant.find((game) => game.id === manuallySelectedGameId)
    : (relevant.find((game) => game.status === "active") || relevant[0]);

  if (selected) {
    activeGameId = selected.id;
    renderGame(selected);
  }

  const creatorTransitions = relevant.filter((game) =>
    game.creator_id === currentUserId
    && game.status === "active"
    && knownGameStatuses.get(game.id) === "open"
  );
  creatorTransitions.forEach((game) => {
    if (manuallySelectedGameId && manuallySelectedGameId !== game.id) return;
    activeGameId = game.id;
    manuallySelectedGameId = game.id;
    setMessage(document.querySelector("#games-status"), `${game.opponent_username || "Player"} accepted your challenge!`);
    showView("games");
    document.querySelectorAll("[data-game-part]").forEach((item) => {
      const selected = item.dataset.gamePart === "my-game";
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll(".game-part").forEach((part) => {
      part.hidden = part.id !== "game-my-game";
    });
  });

  knownGameStatuses = new Map(relevant.map((game) => [game.id, game.status]));
}

function renderGame(game) {
  if (!game) return;
  const live = document.querySelector("#ttt-live");
  live.hidden = false;
  const title = document.querySelector("#ttt-title");
  const statusLabel = document.querySelector("#ttt-status-label");
  const turn = document.querySelector("#ttt-turn");
  const result = document.querySelector("#ttt-result");
  const boardElement = document.querySelector("#ttt-board");
  title.textContent = `${game.creator_username} vs ${game.opponent_username || "waiting"}`;
  statusLabel.textContent = game.status === "finished" ? "Finished" : game.status === "open" ? "Challenge open" : "Match active";

  let myTurn = false;
  let myMark = null;
  if (game.creator_id === currentUserId) myMark = "X";
  if (game.opponent_id === currentUserId) myMark = "O";
  myTurn = game.status === "active" && game.turn === myMark;
  turn.textContent = game.status === "active" ? (myTurn ? "Your turn" : `Waiting for ${game.turn}`) : "";

  if (game.status === "finished") {
    if (game.result === "draw") result.textContent = "Draw";
    else if (game.winner_id === currentUserId) result.textContent = "You won";
    else result.textContent = "You lost";
  } else if (game.status === "open") {
    result.textContent = "Waiting for an opponent";
  } else {
    result.textContent = "";
  }

  boardElement.replaceChildren();
  const cells = game.board.split("");
  cells.forEach((mark, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "ttt-cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Square ${index + 1}${mark === "-" ? " empty" : ` marked ${mark}`}`);
    cell.textContent = mark === "-" ? "" : mark;
    cell.disabled = !myTurn || mark !== "-";
    cell.addEventListener("click", () => playMove(game.id, index));
    boardElement.append(cell);
  });
}

async function playMove(gameId, cellIndex) {
  const status = document.querySelector("#games-status");

  const { data: freshGame, error: freshError } = await supabaseClient
    .from("ttt_games")
    .select("id, creator_id, creator_username, opponent_id, opponent_username, board, turn, status, winner_id, result, created_at, updated_at")
    .eq("id", gameId)
    .single();

  if (freshError) {
    console.error("Couldn’t reload game before move", freshError);
    setMessage(status, freshError.message || "Couldn’t reload the game.", true);
    return;
  }

  const myMark = freshGame.creator_id === currentUserId ? "X" : freshGame.opponent_id === currentUserId ? "O" : null;
  if (freshGame.status !== "active" || freshGame.turn !== myMark || freshGame.board[cellIndex] !== "-") {
    renderGame(freshGame);
    setMessage(status, "That move is no longer available.", true);
    return;
  }

  const { error } = await supabaseClient.rpc("play_ttt_move", { p_game_id: gameId, p_cell: cellIndex });
  if (error) {
    console.error("Tic-Tac-Toe move failed", error);
    setMessage(status, error.message || "Couldn’t make that move.", true);
    await loadMyGames();
    return;
  }

  const { data: updatedGame, error: updateError } = await supabaseClient
    .from("ttt_games")
    .select("id, creator_id, creator_username, opponent_id, opponent_username, board, turn, status, winner_id, result, created_at, updated_at")
    .eq("id", gameId)
    .single();

  if (updateError) {
    console.error("Couldn’t reload updated game", updateError);
    setMessage(status, updateError.message || "Move saved, but the board couldn’t refresh.", true);
  } else {
    activeGameId = gameId;
    manuallySelectedGameId = gameId;
    renderGame(updatedGame);
    setMessage(status, updatedGame.status === "finished" ? "Game finished." : "Move saved.");
  }
  await loadMyGames();
}

async function loadScoreboard() {
  setMessage(document.querySelector("#scoreboard-status"), "Loading scoreboard...");
  const { data, error } = await supabaseClient
    .from("ttt_scoreboard")
    .select("username, wins, losses, draws, games, win_rate")
    .order("wins", { ascending: false });
  if (error) {
    setMessage(document.querySelector("#scoreboard-status"), "Couldn’t load the scoreboard.", true);
    return;
  }
  const ranked = [...data].sort((a, b) => b.wins - a.wins || b.win_rate - a.win_rate);
  const body = document.querySelector("#scoreboard-body");
  body.replaceChildren();
  ranked.forEach((row, index) => {
    const tr = document.createElement("tr");
    [index + 1, row.username, row.wins, row.losses, row.draws, row.games, `${Number(row.win_rate).toFixed(1)}%`].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = String(value);
      tr.append(td);
    });
    body.append(tr);
  });
  setMessage(document.querySelector("#scoreboard-status"), `${ranked.length} player${ranked.length === 1 ? "" : "s"}`);
}

async function loadGamesView() {
  await loadChallenges();
  await loadMyGames();
  await loadScoreboard();
}

async function refreshActiveGame() {
  if (activeView !== "games") return;
  await loadChallenges();
  await loadMyGames();
}

async function refreshScoreboard() {
  if (activeView !== "games") return;
  await loadScoreboard();
}

// Attach Games sub-tabs and refresh active games every 3 seconds / scoreboard every 10 seconds.
const challengeButton = document.querySelector("#challenge-button");
challengeButton.addEventListener("click", createChallenge);
document.querySelectorAll("[data-game-part]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-game-part]").forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll(".game-part").forEach((part) => {
      part.hidden = part.id !== `game-${tab.dataset.gamePart}`;
    });
    loadGamePart(tab.dataset.gamePart);
  });
});

async function initializeHub() {
  await refreshPublicSections();
  await initializeAuth();
  refreshTimer = window.setInterval(() => {
    refreshPublicSections();
    if (isApproved || isAdmin) loadPastes();
  }, 10000);

  gameRefreshTimer = window.setInterval(refreshActiveGame, 3000);
  scoreboardRefreshTimer = window.setInterval(refreshScoreboard, 10000);
}

initializeHub();
