function showPopup(message, type) {
	const popup = document.createElement("div");
	popup.className = `popup ${type}`;
	popup.textContent = message;
	document.body.appendChild(popup);

	setTimeout(() => {
		popup.remove();
	}, 2500);
}

// Add event listener to the parent element
document.getElementById("replacements-list").addEventListener("click", (e) => {
	// Check if the clicked element is an edit button
	if (e.target.closest(".edit-button")) {
		const button = e.target.closest(".edit-button");
		const index = button.getAttribute("data-index");
		console.log("Edit button clicked for index:", index);
		openEditInterface(Number(index)); // Ensure index is a number
	}

	// Check if the clicked element is a delete button
	if (e.target.closest(".delete-button")) {
		const button = e.target.closest(".delete-button");
		const index = button.getAttribute("data-index");
		console.log("Delete button clicked for index:", index);
		deleteReplacement(Number(index)); // Ensure index is a number
	}
});

document.getElementById("word-to-replace").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault(); // Prevent default behavior
		document.getElementById("save-button").click(); // Trigger save action
	}
});

document.getElementById("replacement-word").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault(); // Prevent default behavior
		document.getElementById("save-button").click(); // Trigger save action
	}
});

function updateClearAllButton(replacements) {
	const clearAllButton = document.getElementById("clear-all-button");
	if (replacements && replacements.length > 0) {
		clearAllButton.disabled = false; // Enable the button
	} else {
		clearAllButton.disabled = true; // Disable the button
	}
}

const CHECKMARK_SVG = `
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M18 3C19.6569 3 21 4.34315 21 6V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34315 4.34315 3 6 3H18ZM16.4697 7.96967L10 14.4393L7.53033 11.9697C7.23744 11.6768 6.76256 11.6768 6.46967 11.9697C6.17678 12.2626 6.17678 12.7374 6.46967 13.0303L9.46967 16.0303C9.76256 16.3232 10.2374 16.3232 10.5303 16.0303L17.5303 9.03033C17.8232 8.73744 17.8232 8.26256 17.5303 7.96967C17.2374 7.67678 16.7626 7.67678 16.4697 7.96967Z" fill="#14e177"></path>
    </svg>
`;

const DISABLED_CHECKBOX_SVG = `
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M18 3C19.6569 3 21 4.34315 21 6V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34315 4.34315 3 6 3H18ZM16.4697 7.96967L10 14.4393L7.53033 11.9697C7.23744 11.6768 6.76256 11.6768 6.46967 11.9697C6.17678 12.2626 6.17678 12.7374 6.46967 13.0303L9.46967 16.0303C9.76256 16.3232 10.2374 16.3232 10.5303 16.0303L17.5303 9.03033C17.8232 8.73744 17.8232 8.26256 17.5303 7.96967C17.2374 7.67678 16.7626 7.67678 16.4697 7.96967Z" fill="#c2c2c2"></path>
    </svg>
`;
async function checkAppliedReplacements(replacements) {
	if (!replacements || replacements.length === 0) {
		return [];
	}

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.url) return [];

	const url = new URL(tab.url);
	const hostname = url.hostname;

	return replacements.filter((replacement) => {
		// If "Only allow domains" is populated, check if the current domain is in the list
		if (replacement.onlyAllowedDomains?.length > 0) {
			return replacement.onlyAllowedDomains.some((domain) => hostname.includes(domain));
		}

		// If "Only allow domains" is empty, check if the current domain is not in the excluded list
		if (replacement.excludedDomains?.length > 0) {
			return !replacement.excludedDomains.some((domain) => hostname.includes(domain));
		}

		// If neither is specified, apply to all domains
		return true;
	});
}

// Load saved replacements and display them
async function loadReplacements(replacements) {
	if (!replacements || replacements.length === 0) {
		chrome.storage.sync.get("replacements", async (data) => {
			if (!data.replacements || data.replacements.length === 0) {
				return;
			}

			console.log("data.replacements", data.replacements);
			await loadReplacements(data.replacements || []);
		});
	}

	console.log("4324", replacements);

	const list = document.getElementById("replacements-list");
	const emptyState = document.getElementById("empty-state");

	if (!list) {
		return;
	}

	list.innerHTML = "";

	if ((!replacements || replacements?.length === 0) && emptyState) {
		emptyState.style.display = "block"; // Show empty state
	} else {
		if (emptyState) emptyState.style.display = "none";
		const appliedReplacements = await checkAppliedReplacements(replacements);

		console.log("18423", appliedReplacements);

		replacements?.forEach((replacement, index) => {
			const item = document.createElement("div");
			item.className = "replacement-item";
			const isApplied = appliedReplacements?.some((applied) => applied.wordToReplace === replacement.wordToReplace) || false;
			item.innerHTML = `
				<div class="replacement-content">
					<label class="element-toggle">
						<input type="checkbox" class="toggle-switch" data-index="${index}" ${isApplied ? "checked" : ""} />
						<div class="slider round"></div>
					</label>
					<span>${replacement.wordToReplace} => ${replacement.replacementWord}</span>
				</div>
				<div class="action-buttons">
					<button class="edit-button" data-index="${index}" title="Edit">
						<i class="fas fa-edit"></i>
					</button>
					<button class="delete-button" data-index="${index}" title="Delete">
						<i class="fas fa-trash"></i>
					</button>
				</div>
			`;
			list.appendChild(item);
		});
	}

	updateClearAllButton(replacements);
}

document.getElementById("save-button").addEventListener("click", () => {
	const wordToReplace = document.getElementById("word-to-replace").value;
	const replacementWord = document.getElementById("replacement-word").value;

	if (wordToReplace && replacementWord) {
		chrome.storage.sync.get(["replacements"], async (data) => {
			const replacements = data.replacements || [];

			// Check if the wordToReplace already exists
			const isAlreadyPresent = replacements.some((replacement) => replacement.wordToReplace === wordToReplace);
			if (isAlreadyPresent) {
				return showPopup("Word already replaced!", "error");
			}

			replacements.push({ wordToReplace, replacementWord });

			// Update the UI immediately
			await loadReplacements(replacements);

			// Update the storage
			chrome.storage.sync.set({ replacements }, () => {
				showPopup("Saved!", "success");

				// Clear input fields
				document.getElementById("word-to-replace").value = "";
				document.getElementById("replacement-word").value = "";

				// Notify the content script to update replacements
				chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
					chrome.tabs.sendMessage(tabs[0].id, { action: "updateReplacements", replacements });
				});
			});
		});
	} else {
		showPopup("Please fill in both fields!", "error");
	}
});

function deleteReplacement(index) {
	chrome.storage.sync.get(["replacements"], (data) => {
		const replacements = data.replacements || [];

		// Save the original replacements for reverting
		const originalReplacements = [...replacements];

		// Remove the replacement from the array
		replacements.splice(index, 1);

		// Notify the content script to revert replacements using the original array
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, { action: "revertReplacements", replacements: originalReplacements }, () => {
				// After reverting, update the storage and UI
				chrome.storage.sync.set({ replacements }, () => {
					loadReplacements();
					// Show the deletion popup
					showPopup("Deleted!", "error");
					// Notify the content script to apply the updated replacements
					chrome.tabs.sendMessage(tabs[0].id, { action: "updateReplacements", replacements });
				});
			});
		});
	});
}

loadReplacements();

// Edit functionality

let currentEditIndex = null;

// Function to update the edit modal fields based on toggle state
function updateEditModalFields(isAllowOnlyActive) {
	const allowOnlyInput = document.getElementById("edit-only-allow-domains");
	const excludedInput = document.getElementById("edit-excluded-domains");

	if (isAllowOnlyActive) {
		allowOnlyInput.disabled = false;
		excludedInput.disabled = true;
	} else {
		allowOnlyInput.disabled = true;
		excludedInput.disabled = false;
	}
}

// Add event listeners for the toggle buttons
document.getElementById("toggle-allow-only").addEventListener("change", (e) => {
	const isAllowOnlyActive = e.target.checked;
	document.getElementById("toggle-excluded").checked = !isAllowOnlyActive;
	updateEditModalFields(isAllowOnlyActive);
});

document.getElementById("toggle-excluded").addEventListener("change", (e) => {
	const isExcludedActive = e.target.checked;
	document.getElementById("toggle-allow-only").checked = !isExcludedActive;
	updateEditModalFields(!isExcludedActive);
});

// Function to open the edit interface
function openEditInterface(index) {
	chrome.storage.sync.get(["replacements"], (data) => {
		const replacements = data.replacements || [];
		const replacement = replacements[index];

		console.log("19244", index, replacement);

		// Populate the edit modal with the current values
		document.getElementById("edit-word-to-replace").value = replacement.wordToReplace;
		document.getElementById("edit-replacement-word").value = replacement.replacementWord;
		document.getElementById("edit-only-allow-domains").value = replacement.onlyAllowedDomains?.join(", ") || "";
		document.getElementById("edit-excluded-domains").value = replacement.excludedDomains?.join(", ") || "";

		// Set the toggle states
		document.getElementById("toggle-allow-only").checked = replacement.isAllowOnlyActive || false;
		document.getElementById("toggle-excluded").checked = replacement.isExcludedActive || false;
		// Disable the inactive field
		updateEditModalFields(replacement.isAllowOnlyActive);
		// Show the modal
		document.getElementById("edit-modal").style.display = "flex";
		currentEditIndex = index;
	});
}

// Add event listeners for Enter key in the edit modal
document.getElementById("edit-word-to-replace").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault(); // Prevent default behavior
		document.getElementById("save-edit-button").click(); // Trigger save action
	}
});

document.getElementById("edit-replacement-word").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault(); // Prevent default behavior
		document.getElementById("save-edit-button").click(); // Trigger save action
	}
});

// Function to save changes
document.getElementById("save-edit-button").addEventListener("click", () => {
	const wordToReplace = document.getElementById("edit-word-to-replace").value;
	const replacementWord = document.getElementById("edit-replacement-word").value;
	const onlyAllowDomains = document
		.getElementById("edit-only-allow-domains")
		.value.split(",")
		.map((domain) => domain.trim())
		.filter((domain) => domain);
	const excludedDomains = document
		.getElementById("edit-excluded-domains")
		.value.split(",")
		.map((domain) => domain.trim())
		.filter((domain) => domain);

	const isAllowOnlyActive = document.getElementById("toggle-allow-only").checked;
	const isExcludedActive = document.getElementById("toggle-excluded").checked;

	if (wordToReplace && replacementWord) {
		// Ensure at least one toggle is active with valid domains
		if ((isAllowOnlyActive && onlyAllowDomains.length === 0) || (isExcludedActive && excludedDomains.length === 0)) {
			showPopup("Please add at least one domain for the active toggle!", "error");
			return;
		}

		chrome.storage.sync.get(["replacements"], (data) => {
			const replacements = data.replacements || [];

			// Check if the wordToReplace already exists (excluding the current entry)
			const isAlreadyPresent = replacements.some(
				(replacement, index) => replacement.wordToReplace === wordToReplace && index !== currentEditIndex
			);

			if (isAlreadyPresent) {
				showPopup(`"${wordToReplace}" is already being replaced.`, "error");
			} else {
				const originalReplacements = [...replacements];
				const replacement = {
					wordToReplace,
					replacementWord,
					onlyAllowedDomains: onlyAllowDomains,
					excludedDomains: onlyAllowDomains.length > 0 ? [] : excludedDomains, // Excluded domains are ignored if onlyAllowedDomains is populated
					isAllowOnlyActive,
					isExcludedActive,
				};

				if (currentEditIndex !== null) {
					// Update existing replacement
					replacements[currentEditIndex] = replacement;
				} else {
					// Add new replacement
					replacements.push(replacement);
				}

				// Update the storage
				chrome.storage.sync.set({ replacements }, () => {
					// Update the UI
					loadReplacements();
					showPopup("Changes saved!", "success");

					// Close the modal
					document.getElementById("edit-modal").style.display = "none";
					currentEditIndex = null;

					chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
						chrome.tabs.sendMessage(tabs[0].id, { action: "revertReplacements", replacements: originalReplacements }, () => {
							chrome.tabs.sendMessage(tabs[0].id, { action: "updateReplacements", replacements }, () => {
								showPopup("Replacements updated!", "success");
							});
						});
					});
				});
			}
		});
	} else {
		showPopup("Please fill in both fields!", "error");
	}
});

// Function to cancel editing
document.getElementById("cancel-edit-button").addEventListener("click", () => {
	document.getElementById("edit-modal").style.display = "none";
	currentEditIndex = null;
});

document.getElementById("clear-all-button").addEventListener("click", () => {
	chrome.storage.sync.get(["replacements"], (data) => {
		const replacements = data.replacements || [];

		// Revert replacements on the current page
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, { action: "revertReplacements", replacements }, () => {
				// Clear replacements from storage
				chrome.storage.sync.set({ replacements: [] }, () => {
					loadReplacements([]); // Clear the UI
					showPopup("All replacements cleared!", "success");

					// Notify the content script to update replacements (empty array)
					chrome.tabs.sendMessage(tabs[0].id, { action: "updateReplacements", replacements: [] });
				});
			});
		});
	});
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	if (request.action === "revertReplacement") {
		await replaceTextInNode(document.body, [request.replacement], true); // Revert the specific replacement
		sendResponse({ success: true });
	} else if (request.action === "updateReplacement") {
		await replaceTextInNode(document.body, [request.replacement], false); // Apply the specific replacement
		sendResponse({ success: true });
	}
});

// Function to toggle the active state of a replacement
function toggleReplacementActiveState(index) {
	chrome.storage.sync.get(["replacements"], (data) => {
		const replacements = data.replacements || [];
		const replacement = replacements[index];

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			const url = new URL(tabs[0].url);
			const hostname = url.hostname;

			//deep copy replacements
			const originalReplacements = JSON.parse(JSON.stringify(replacements));

			// Initialize arrays if they don't exist
			if (!replacement.onlyAllowedDomains) {
				replacement.onlyAllowedDomains = [];
			}
			if (!replacement.excludedDomains) {
				replacement.excludedDomains = [];
			}

			// Determine which toggle is active
			const isAllowOnlyActive = replacement.isAllowOnlyActive || false;
			const isExcludedActive = replacement.isExcludedActive || false;

			if (isAllowOnlyActive) {
				// If "Only allow domains" is active, add the current domain to the allow list
				if (!replacement.onlyAllowedDomains.includes(hostname)) {
					replacement.onlyAllowedDomains.push(hostname);
					showPopup("Added to allowed domains!", "success");
				} else {
					// If the current domain is already in the allow list, remove it
					replacement.onlyAllowedDomains = replacement.onlyAllowedDomains.filter((domain) => domain !== hostname);
					showPopup("Removed from allowed domains!", "success");

					// If the allow list is now empty, turn off the toggle
					if (replacement.onlyAllowedDomains.length === 0) {
						replacement.isAllowOnlyActive = false;
					}
				}
			} else if (isExcludedActive) {
				// If "Excluded domains" is active, add the current domain to the exclude list
				if (!replacement.excludedDomains.includes(hostname)) {
					replacement.excludedDomains.push(hostname);
					showPopup("Added to excluded domains!", "success");
				} else {
					// If the current domain is already in the exclude list, remove it
					replacement.excludedDomains = replacement.excludedDomains.filter((domain) => domain !== hostname);
					showPopup("Removed from excluded domains!", "success");

					// If the allow list is now empty, turn off the toggle
					if (replacement.excludedDomains.length === 0) {
						replacement.isExcludedActive = false;
					}
				}
			} else {
				// If neither is active, default to "Excluded domains" and add the current domain
				replacement.isExcludedActive = true;
				replacement.excludedDomains.push(hostname);
				showPopup("Added to excluded domains!", "success");
			}

			// Update the storage
			chrome.storage.sync.set({ replacements }, () => {
				// Reload the UI to reflect the changes
				loadReplacements(replacements);
				// Notify the content script to update replacements
				chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
					chrome.tabs.sendMessage(tabs[0].id, { action: "revertReplacements", replacements: originalReplacements }, () => {
						chrome.tabs.sendMessage(tabs[0].id, { action: "updateReplacements", replacements });
					});
				});
			});
		});
	});
}

// Add event listeners for toggle switches
document.getElementById("replacements-list").addEventListener("click", (e) => {
	if (e.target.closest(".toggle-switch")) {
		const checkbox = e.target.closest(".toggle-switch");
		const index = checkbox.getAttribute("data-index");
		toggleReplacementActiveState(Number(index));
	}
});

// Add Enter key functionality to domains input in the modal
document.getElementById("edit-only-allow-domains").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		document.getElementById("save-edit-button").click();
	}
});

document.getElementById("edit-excluded-domains").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		document.getElementById("save-edit-button").click();
	}
});
