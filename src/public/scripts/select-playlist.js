document.getElementById("left-trigger-div").addEventListener("click", () => {
  const event1 = new Event("click-left-select-playlist");
  document
    .getElementById("left-trigger-update-select-playlist")
    .dispatchEvent(event1);

  const event2 = new Event("click-left-update-playlist");
  document.getElementById("left-trigger-update-playlist").dispatchEvent(event2);
});

document.getElementById("middle-trigger-div").addEventListener("click", () => {
  const event1 = new Event("click-middle-select-playlist");
  document
    .getElementById("middle-trigger-update-select-playlist")
    .dispatchEvent(event1);

  const event2 = new Event("click-middle-update-playlist");
  document
    .getElementById("middle-trigger-update-playlist")
    .dispatchEvent(event2);
});

document.getElementById("right-trigger-div").addEventListener("click", () => {
  const event1 = new Event("click-right-select-playlist");
  document
    .getElementById("right-trigger-update-select-playlist")
    .dispatchEvent(event1);

  const event2 = new Event("click-right-update-playlist");
  document
    .getElementById("right-trigger-update-playlist")
    .dispatchEvent(event2);
});
