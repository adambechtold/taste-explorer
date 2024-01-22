function showSnackbar(message) {
  document.getElementById("snackbar-message").innerHTML = message;
  document.getElementById("snackbar-container").style.visibility = "visible";
}

function clearSnackbar() {
  document.getElementById("snackbar-container").style.visibility = "hidden";
  document.getElementById("snackbar-message").innerHTML = "";
}

function attachSnackbarCloseButton() {
  document
    .getElementById("snackbar-dismiss-button")
    .addEventListener("click", () => {
      clearSnackbar();
    });
}

window.attachSnackbarCloseButton = attachSnackbarCloseButton;

document.addEventListener("DOMContentLoaded", function () {
  attachSnackbarCloseButton();
});

document.addEventListener("htmx:afterSettle", () => {
  attachSnackbarCloseButton();
});
