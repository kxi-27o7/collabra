function getCurrentUser() {
  const savedUser = localStorage.getItem("collabraCurrentUser");

  if (savedUser) {
    return JSON.parse(savedUser);
  }

  return {
    id: 1,
    fullName: "Current User",
    email: "current.user@university.edu"
  };
}

function getProjects() {
  const projects = localStorage.getItem("collabraProjects");
  return projects ? JSON.parse(projects) : [];
}

function saveProjects(projects) {
  localStorage.setItem("collabraProjects", JSON.stringify(projects));
}

function createProjectWithRoles(projectData) {
  const currentUser = getCurrentUser();
  const projects = getProjects();

  const newProject = {
    id: Date.now(),
    name: projectData.name,
    description: projectData.description,
    deadline: projectData.deadline,
    status: projectData.status,
    projectManager: {
      id: currentUser.id,
      name: currentUser.fullName,
      email: currentUser.email
    },
    teamMembers: projectData.members.map((member) => ({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: member.name,
      email: member.email || "",
      role: "Team Member"
    })),
    createdAt: new Date().toISOString()
  };

  projects.push(newProject);
  saveProjects(projects);

  return newProject;
}

function getUserRoleInProject(project) {
  const currentUser = getCurrentUser();

  if (project.projectManager?.email === currentUser.email) {
    return "Project Manager";
  }

  const isTeamMember = project.teamMembers?.some((member) => {
    return member.email === currentUser.email || member.name === currentUser.fullName;
  });

  if (isTeamMember) {
    return "Team Member";
  }

  return "No Role";
}