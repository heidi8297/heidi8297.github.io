let redirect_Page = (timeout) => {
    let tID = setTimeout(function () {
        window.location.href = "http://heidistockton.com/orgchart";
        window.clearTimeout(tID);		// clear time out.
    }, timeout);
}

redirect_Page(32700);



$(document).ready(function() {
  setTimeout(function(){ $(".singleLine.f01").fadeIn(1000) }, 0);
  setTimeout(function(){ $(".singleLine.f01").fadeOut(1000) }, 4300);

  setTimeout(function(){ $(".singleLine.f02").fadeIn(1000) }, 5500);
  setTimeout(function(){ $(".singleLine.f02").fadeOut(1000) }, 10300);

  setTimeout(function(){ $(".singleLine.f03").fadeIn(1000) }, 11900);
  setTimeout(function(){ $(".singleLine.f03").fadeOut(1000) }, 17500);

  setTimeout(function(){ $(".singleLine.f04").fadeIn(1000) }, 18700);
  setTimeout(function(){ $(".singleLine.f04").fadeOut(1000) }, 24800);

  setTimeout(function(){ $(".singleLine.f05").fadeIn(1000) }, 21200);
  setTimeout(function(){ $(".singleLine.f05").fadeOut(1000) }, 24800);

  setTimeout(function(){ $(".singleLine.f06").fadeIn(1000) }, 26000);
  setTimeout(function(){ $(".singleLine.f06").fadeOut(1000) }, 31500);
});
