const $UI = {
    enterButton: document.getElementById("enterButton")! as HTMLButtonElement,
    mobileButton: document.getElementById("mobileButton")! as HTMLButtonElement,
    isDMInput: document.getElementById("isDMInput")! as HTMLInputElement,
}

$UI.enterButton.onclick = () => {
    if (!$UI.isDMInput.checked) { window.location.href = 'map.html'; return; }
    if (confirm("SPOILERS AHEAD! Are you sure that you are the DM?")) { window.location.href = 'map.html'; return; }
    $UI.isDMInput.checked = false;
    document.body.style.backgroundImage = "url(images/Player.jpg)";
    setCookie("isDM", '0');
}

window.onload = function() {
    switch (getCookie("isDM")) {
        case '1':
            document.body.style.setProperty("background-image", "url(images/Dungeonmaster.jpg)");
            $UI.isDMInput.checked = true;
            break;
        case '0':
            document.body.style.setProperty("background-image", "url(images/Player.jpg)");
            $UI.isDMInput.checked = false;
            break;
        default:
            document.body.style.setProperty("background-image", "url(images/Player.jpg)");
            setCookie("isDM", '0');
            break;
    }       
}

$UI.isDMInput.onchange = function() {
    if ($UI.isDMInput.checked) {
        document.body.style.backgroundImage = "url(images/Dungeonmaster.jpg)";
        setCookie("isDM", '1');
        return;
    }
    document.body.style.backgroundImage = "url(images/Player.jpg)";
    setCookie("isDM", '0');
}

//#region custom zoom
if(!navigator.userAgent.includes("Chrome") && !navigator.userAgent.includes("Firefox")) { alert("Room of thought is only supported for firefox and chrome. Some features may be unavailable!"); }
//#endregion

//#region cookies
function setCookie(cname:string, cvalue:string) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname:string) {
    for(let c of document.cookie.split(';')) {
        c = c.trim();
        if (c.startsWith(cname)) { return c.substring(cname.length+1, c.length); }
    }
    return "";
}
//#endregion