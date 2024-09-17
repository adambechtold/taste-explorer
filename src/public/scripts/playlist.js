const containers = document.getElementsByClassName("marquee-container");
var i = Array.from(containers);

Array.from(containers).forEach((element) => {
  console.log("Container", element);
  const textElements = element.querySelectorAll(".marquee-text");

  textElements.forEach((text) => {
    console.log("Text", text);
    if (text.scrollWidth > element.clientWidth) {
      text.style.animation = "marquee 10s linear infinite";
    }
  });
});
