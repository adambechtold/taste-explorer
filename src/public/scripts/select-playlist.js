console.log("hi from select-playlist.js");

document
  .getElementById("select-playlist-user1-only-button")
  .addEventListener("click", (something) => {
    console.log("select-playlist-user1-only-button clicked");
    toggleAppliedState(something.target);
  });

function toggleAppliedState(element) {
  element.classList.toggle("applied");
}
