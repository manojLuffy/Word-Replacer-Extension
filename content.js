async function replaceTextInNode(node, replacements, reset = false) {
	if (node.nodeType === Node.TEXT_NODE && node.parentNode.tagName !== "SCRIPT" && node.parentNode.tagName !== "STYLE") {
		let textContent = node.textContent;
		replacements?.forEach((replacement) => {
			if (reset) {
				const regex = new RegExp(`\\b${replacement.replacementWord}\\b`, "gi");
				textContent = textContent.replace(regex, replacement.wordToReplace);
			} else {
				const regex = RegExp(`\\b${replacement.wordToReplace}\\b`, "gi");
				textContent = textContent.replace(regex, replacement.replacementWord);
			}
		});
		node.textContent = textContent;
	} else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
		node.childNodes.forEach((childNode) => replaceTextInNode(childNode, replacements, reset));
	}
}

async function revertReplacements(replacements) {
	const url = new URL(window.location.href);
	const hostname = url.hostname;

	// Filter replacements for the current domain
	const filteredReplacements = replacements.filter((replacement) => {
		// Check if the replacement is explicitly excluded for this domain
		if (replacement.excludedDomains?.includes(hostname)) {
			return false;
		}

		// Check if the replacement is explicitly enabled for this domain
		if (replacement.onlyAllowedDomains?.length > 0) {
			return replacement.onlyAllowedDomains.some((domain) => hostname.includes(domain));
		}

		// If no domains are specified, apply to all domains (unless excluded)
		return true;
	});

	// Revert filtered replacements
	await replaceTextInNode(document.body, filteredReplacements, true);
}
async function applyReplacements(replacements) {
	const url = new URL(window.location.href);
	const hostname = url.hostname;

	// Filter replacements for the current domain
	const filteredReplacements = replacements.filter((replacement) => {
		// Check if the replacement is explicitly excluded for this domain
		if (replacement.excludedDomains?.includes(hostname)) {
			return false;
		}

		// Check if the replacement is explicitly enabled for this domain
		if (replacement.onlyAllowedDomains?.length > 0) {
			return replacement.onlyAllowedDomains.some((domain) => hostname.includes(domain));
		}

		// If no domains are specified, apply to all domains (unless excluded)
		return true;
	});

	// Apply filtered replacements
	await replaceTextInNode(document.body, filteredReplacements, false);
}

chrome.storage.sync.get(["replacements"], (data) => {
	const replacements = data.replacements || [];
	applyReplacements(replacements);
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	if (request.action === "revertReplacements") {
		await revertReplacements(request.replacements);
		sendResponse({ success: true });
	} else if (request.action === "updateReplacements") {
		await applyReplacements(request.replacements);
		sendResponse({ success: true });
	}
});

const observer = new MutationObserver((mutations) => {
	chrome.storage.sync.get(["replacements"], (data) => {
		const replacements = data.replacements || [];
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "SCRIPT" && node.tagName !== "STYLE") {
					replaceTextInNode(node, replacements);
				}
			});
		});
	});
});

observer.observe(document.body, {
	childList: true,
	subtree: true,
});
