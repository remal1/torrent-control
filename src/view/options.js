var options;

const serverSelect = document.querySelector("#server-list");
const saveButton = document.querySelector("#save-options");

const isLabelsSupported = (servers) =>
  servers.some((server) => {
    const client = clientList.find(
      (client) => client.id === server.application
    );

    if (
      client &&
      client.torrentOptions &&
      client.torrentOptions.includes("label")
    ) {
      return true;
    }
    return false;
  });

const persistOptions = () => {
  options.globals.contextMenu = ~~document.querySelector(
    '[name="contextmenu"]:checked'
  ).value;
  options.globals.catchUrls = document.querySelector("#catchurls").checked;
  options.globals.addPaused = document.querySelector("#addpaused").checked;
  options.globals.addAdvanced = document.querySelector("#addadvanced").checked;
  options.globals.enableNotifications = document.querySelector(
    "#enablenotifications"
  ).checked;

  const labels = document.querySelector("#labels").value.split(/\n/g) || [];
  options.globals.labels = labels
    .map((label) => label.trim())
    .filter((label) => label.length);

  const autoPathList = getAutoPathList();

  let clientOptions = {};
  Array.from(document.querySelectorAll('*[id^="clientOptions"]')).forEach(
    (element) => {
      clientOptions[element.id.match(/\[(.+?)\]$/)[1]] = element.checked;
    }
  );

  options.servers[~~serverSelect.value] = {
    name: document.querySelector("#name").value,
    application: document.querySelector("#application").value,
    hostname: document
      .querySelector("#hostname")
      .value.replace(/\s+/, "")
      .replace(/\/?$/, "/"),
    username: document.querySelector("#username").value,
    password: document.querySelector("#password").value,
    clientOptions: clientOptions,
    autoPath: document.querySelector("#autopath").checked,
    directories: autoPathList,
  };
  saveOptions(options);

  saveButton.setAttribute("disabled", true);
};

const restoreOptions = () => {
  document
    .querySelectorAll("textarea, input, select:not(#server-list)")
    .forEach((element) => {
      element.addEventListener(
        "input",
        () => {
          saveButton.removeAttribute("disabled");
          refreshAutoPathList();
        },
        { passive: true }
      );
    });
  document.querySelector(
    "#labels"
  ).placeholder = "Label\nAnother label".replace(/\\n/g, "\n");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = chrome.i18n.getMessage(
      element.getAttribute("data-i18n")
    );
  });

  clientList.forEach((client) => {
    let element = document.createElement("option");
    element.setAttribute("value", client.id);
    element.textContent = client.name;
    document.querySelector("#application").appendChild(element);
  });

  loadOptions().then((newOptions) => {
    options = newOptions;
    document.querySelector(
      '[name="contextmenu"][value="' + options.globals.contextMenu + '"]'
    ).checked = true;
    document.querySelector("#catchurls").checked = options.globals.catchUrls;
    document.querySelector("#addpaused").checked = options.globals.addPaused;
    document.querySelector("#addadvanced").checked =
      options.globals.addAdvanced;
    document.querySelector("#enablenotifications").checked =
      options.globals.enableNotifications;

    document.querySelector("#labels").value = options.globals.labels.join("\n");

    restoreServerList();
    restoreServer(serverSelect.value);
  });

  saveButton.setAttribute("disabled", true);
};

const restoreServerList = () => {
  const selectedServer = serverSelect.value || 0;
  serverSelect.innerHTML = "";

  options.servers.forEach((server, id) => {
    let element = document.createElement("option");
    element.setAttribute("value", id.toString());
    element.textContent = server.name;
    serverSelect.appendChild(element);
  });

  let element = document.createElement("option");
  element.setAttribute("value", "add");
  element.textContent = chrome.i18n.getMessage("addServerAction");
  serverSelect.appendChild(element);

  serverSelect.value = selectedServer;
};

const restoreServer = (id) => {
  const server = options.servers[~~id];
  serverSelect.value = id;
  options.globals.currentServer = ~~id;
  saveOptions(options);

  document.querySelector("#name").value = server.name;
  document.querySelector("#application").value = server.application;
  document.querySelector("#hostname").value = server.hostname;
  document.querySelector("#username").value = server.username;
  document.querySelector("#password").value = server.password;
  document.querySelector("#autopath").checked = server.autoPath;
  const pathList = document.getElementById("autopathlist");
  while (pathList.rows.length > 1) {
    pathList.deleteRow(1);
  }
  restoreAutoPathList(server);
  document.querySelector("#application").dispatchEvent(new Event("change"));

  if (options.servers.length > 1)
    document.querySelector("#remove-server").removeAttribute("disabled");
  else document.querySelector("#remove-server").setAttribute("disabled", true);
};

const addNewPath = (folder = "", pattern = "") => {
  const table = document.getElementById("autopathlist");
  const autoPathLength = table.rows.length;
  const autoPath = table.insertRow(autoPathLength);
  const dir = document.createElement("input");
  const currServer = options.servers[options.globals.currentServer];
  dir.type = "text";
  dir.id = `autopath_${autoPathLength}`;
  dir.style.width = "100%";
  dir.placeholder = "/downloads/hd-series";
  dir.value = folder;
  dir.addEventListener(
    "input",
    () => {
      const patternInput = document.getElementById(
        `autopathpattern_${autoPathLength}`
      );
      if (dir.value.length) {
        saveButton.removeAttribute("disabled");
        if (currServer.autoPath) patternInput.removeAttribute("disabled");
      } else {
        patternInput.setAttribute("disabled", true);
      }
      refreshAutoPathList();
    },
    { passive: true }
  );

  const dirCell = autoPath.insertCell(0);
  dirCell.appendChild(dir);

  const patt = document.createElement("input");
  patt.type = "text";
  patt.id = `autopathpattern_${autoPathLength}`;
  patt.style.width = "100%";
  patt.placeholder = "S[0-9]{2}E[0-9]{2}.*\\.(720|1080|2160)p";
  patt.value = pattern;
  patt.addEventListener(
    "input",
    () => {
      if (dir.value.length) saveButton.removeAttribute("disabled");
    },
    { passive: true }
  );

  const pattCell = autoPath.insertCell(1);
  pattCell.appendChild(patt);

  const delBtn = document.createElement("button");
  delBtn.id = `delete-path_${autoPathLength}`;
  cellContent = document.createTextNode(
    chrome.i18n.getMessage(autoPathLength < 2 ? "clearPath" : "deletePath")
  );
  delBtn.appendChild(cellContent);
  delBtn.style.width = "auto";
  delBtn.style.float = "right";
  delBtn.addEventListener("click", (e) => {
    const idx = e.target.parentNode.parentNode.rowIndex;
    if (idx > 1) table.deleteRow(idx);
    else {
      dir.value = "";
      patt.value = "";
      refreshAutoPathList();
    }
    saveButton.removeAttribute("disabled");
  });
  const delCell = autoPath.insertCell(2);
  delCell.appendChild(delBtn);
};

const restoreAutoPathList = (server) => {
  if (server.directories.length === 0) addNewPath();
  else {
    for (let index = 0; index < server.directories.length; index++) {
      const autoPath = server.directories[index];
      if (!autoPath.dir && !autoPath.pattern) continue;
      addNewPath(autoPath.dir, autoPath.pattern);
    }
  }
  refreshAutoPathList();
};

const addServer = () => {
  options.servers.push({
    name: "New server",
    application: clientList[0].id,
    hostname: "",
    username: "",
    password: "",
    directories: [],
    autoPath: false,
  });

  restoreServerList();
  restoreServer(options.servers.length - 1);
  persistOptions();
};

const removeServer = (id) => {
  if (options.servers.length > 1) options.servers.splice(~~id, 1);

  if (options.globals.currentServer === ~~id) options.globals.currentServer = 0;

  restoreServerList();
  restoreServer(0);
  persistOptions();
};

const validateUrl = (str) => {
  try {
    const url = new URL(str);
  } catch (e) {
    return false;
  }
  return true;
};

const getAutoPathList = () => {
  const list = [];
  const table = document.getElementById("autopathlist");
  for (let index = 0; index < table.rows.length; index++) {
    const dirVal = table.rows[index].cells[0].firstChild.value;
    const pattVal = table.rows[index].cells[1].firstChild.value;
    if (index === 0 || dirVal === "") continue;
    list.push({
      dir: dirVal,
      pattern: pattVal,
    });
  }
  return list;
};

const refreshAutoPathList = () => {
  const server = options.servers[options.globals.currentServer];
  const table = document.getElementById("autopathlist");
  for (let index = 0; index < table.rows.length; index++) {
    if (index === 0) continue;
    const row = table.rows[index];
    const folder = row.cells[0];
    const pattern = row.cells[1];
    const btn = row.cells[2];
    const folderValLen = folder.firstChild.value.length;
    const patternValLen = pattern.firstChild.value.length;
    if (index === 1) btn.firstChild.disabled = folderValLen || patternValLen ? false : true;
    pattern.firstChild.disabled = server.autoPath && folderValLen ? false : true;
  }
};

serverSelect.addEventListener("change", (e) => {
  e.target.value === "add" ? addServer() : restoreServer(e.target.value);
});

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#remove-server").addEventListener("click", (e) => {
  e.preventDefault();
  removeServer(serverSelect.value);
  restoreServerList();
});

document.querySelector("#save-options").addEventListener("click", (e) => {
  e.preventDefault();
  const hostname = document
    .querySelector("#hostname")
    .value.replace(/\s+/, "")
    .replace(/\/?$/, "/");

  if (validateUrl(hostname)) {
    persistOptions();
    restoreServerList();
  } else {
    alert("Server address is invalid");
  }
  refreshAutoPathList();
});

document.querySelector("#autopath").addEventListener("click", (e) => {
  const server = options.servers[options.globals.currentServer];
  server.autoPath = e.target.checked;
  refreshAutoPathList();
});

document.querySelector("#new-path").addEventListener("click", (e) => {
  addNewPath();
  refreshAutoPathList();
});

document.querySelector("#application").addEventListener("change", (e) => {
  const client = clientList.find((client) => client.id === e.target.value);

  if (client) {
    document
      .querySelector("#hostname")
      .setAttribute("placeholder", client.addressPlaceholder);

    const currentAddress = document.querySelector("#hostname").value;

    if (
      currentAddress === "" ||
      clientList.find((client) => client.addressPlaceholder === currentAddress)
    )
      document.querySelector("#hostname").value = client.addressPlaceholder;

    document.querySelector('[data-panel="labels"]').style.display =
      isLabelsSupported(options.servers) ||
      (client.torrentOptions && client.torrentOptions.includes("label"))
        ? "flex"
        : "none";

    document.querySelector('[data-panel="autoPath"]').style.display =
      client.torrentOptions && client.torrentOptions.includes("path")
        ? "flex"
        : "none";

    document.querySelector('[data-panel="autoPathList2"]').style.display =
      client.torrentOptions && client.torrentOptions.includes("path")
        ? "flex"
        : "none";

    if (client.id === "deluge")
      document.querySelector("#username").setAttribute("disabled", "true");
    else document.querySelector("#username").removeAttribute("disabled");

    let clientOptionsPanel = document.querySelector(
      '[data-panel="clientOptions"]'
    );
    Array.from(clientOptionsPanel.childNodes).forEach((element) =>
      element.parentNode.removeChild(element)
    );

    if (client.clientOptions) {
      const server = options.servers[options.globals.currentServer];

      client.clientOptions.forEach((option) => {
        let container = document.createElement("div");
        container.className = "panel-formElements-item browser-style";

        let input = document.createElement("input");
        input.type = "checkbox";
        input.id = "clientOptions[" + option.name + "]";
        input.checked =
          server.application === client.id
            ? !!server.clientOptions[option.name]
            : false;
        input.addEventListener(
          "input",
          () => {
            saveButton.removeAttribute("disabled");
          },
          { passive: true }
        );
        container.appendChild(input);

        let label = document.createElement("label");
        label.htmlFor = "clientOptions[" + option.name + "]";
        label.textContent = option.description;
        container.appendChild(label);

        clientOptionsPanel.appendChild(container);
      });
    }
  }
});
document.querySelector("#hostname").addEventListener("input", (e) => {
  const hostname = e.target.value.replace(/\s+/, "").replace(/\/?$/, "/");

  if (validateUrl(hostname))
    document.querySelector("#hostname").setAttribute("style", "");
  else
    document
      .querySelector("#hostname")
      .setAttribute("style", "border-color:red;");
});
