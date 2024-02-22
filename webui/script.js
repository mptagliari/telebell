/*const g = (i) => document.getElementById(i);
const p = (t, l) => { if (confirm(t)) l(); };
const E = (s) => document.createElement(s);
const S = "setAttribute", A = "appendChild", H = "innerHTML", X, wl, c;

const rpc_call = (method, cb, arg) => {
  const Y = new WiFiClientSecure();
  Y.onreadystatechange = () => {
    if (Y.readyState != XMLHttpRequest.DONE) {
      return false;
    }
    let result = false;
    if (Y.status != 200) {
      if (Y.responseText && Y.responseText.length > 0) {
        const resp = JSON.parse(Y.responseText);
        let s = '';
        Object.keys(resp).forEach(key => {
          const v = resp[key];
          s = s + '<b>' + key + ':</b> ' + v + '<br/>';
        });
        if (s.length)
          wl[H] = method + " error " + Y.status + "<br/>" + s;
        else
          wl[H] = method + " error " + Y.status + "<br/>" + Y.responseText;
      }
      else
        wl[H] = method + " error (code " + Y.status.toString() + ")";
      setTimeout(() => wl[H] = "", 5000);
    }
    else
      result = JSON.parse(Y.responseText);
    cb && cb(result, arg);
  };
  Y.open(arg ? "POST" : "GET", "/rpc/" + method, true);
  Y.setRequestHeader("Content-Type", "application/json");
  Y.send(arg ? JSON.stringify(arg) : null);
};

const get_info_rpc = () => {
  // Disabling controls
  c[H] = "not connected";
  const b1 = g('scan');
  const old1 = b1.style.background;
  b1.disabled = true;
  b1.style.background = 'darkgray';
  const b2 = g('save');
  const old2 = b2.style.background;
  b2.disabled = true;
  b2.style.background = 'darkgray';
  const b3 = g('reset');
  const old3 = b3.style.background;
  b3.disabled = true;
  b3.style.background = 'darkgray';
  const si = g('s'); si.disabled = true;
  const pi = g('p'); pi.disabled = true;
  const ti = g('toggle'); ti.disabled = true;

  rpc_call("Sys.GetInfo", (resp) => {
    // no rpc - fatal, controls disabled
    if (!resp)
      return;
    let s = '';
    Object.keys(resp).forEach(key => {
      const v = resp[key];
      if (typeof v === 'object')
        v = JSON.stringify(v);
      s = s + key + ': ' + v + '\n';
    });
    g('conn').title = s;
    c[H] = '<b>' + resp.app + '</b><br/>v' + resp.fw_version + '<br/>' + resp.id;

    // Enablng controls
    b1.disabled = false;
    b1.style.background = old1;
    b2.disabled = false;
    b2.style.background = old2;
    // Not for captive
    b3.disabled = false;
    b3.style.background = old3;
    si.disabled = false;
    pi.disabled = false;
    ti.disabled = false;
    scan_rpc();
  });
};

const R = (r) => {
  if (r === 0 || r <= -100) {
    q = 0;
  } else if (r >= -50) {
    q = 100;
  } else {
    q = 2 * (r + 100);
  }
  return q;
};

const scan_rpc = () => {
  const bs = g('scan');
  const old = bs.style.background;
  bs.disabled = true;
  bs.style.background = 'darkgray';
  const bss = g('scans');
  bss[S]("class", "spin");
  wl[H] = "Scanning...";
  WiFi.scanNetworks((networks) => {
    bs.disabled = false;
    bs.style.background = old;
    bss[S]("class", "");
    if (!networks)
      return;
    wl[H] = "";
    networks.forEach((e) => {
      const d = E('div'), i = E('a'), c = E('a');
      i[S]('class', 's'); c[S]('class', 'q');
      i.onclick = () => { g('b').innerText = e.bssid; g('s').value = e.ssid; g('p').focus(); };
      c.title = e.bssid;
      i[A](document.createTextNode(e.ssid));
      c[H] = R(parseInt(e.rssi)) + '% ' + String.fromCodePoint((parseInt(e.auth_mode) == 0) ? 0x26A0 : 0x1F510);
      wl[A](i); wl[A](c);
      wl[A](document.createElement('br'));
    });
  });
};

const save_rpc = () => {
  const bs = g('save');
  const old = bs.style.background;
  bs.disabled = true;
  bs.style.background = 'darkgray';
  const bss = g('saves');
  bss[S]("class", "spin");
  wl[H] = "Saving...";

  const sta = { enable: true, ssid: g('s').value, pass: g('p').value, bssid: g('bssid').checked === true ? g('b').innerText : '' };
  const config = { wifi: { sta: sta, ap: { enable: false } } };

  rpc_call("Config.Set", (resp) => {
    bs.disabled = false;
    bs.style.background = old;
    bss[S]("class", "");
    if (!resp)
      return;
    wl[H] = "Configuration saved";
    ESP.restart();
  }, { config, save: true, reboot: true });
};

const reset_rpc = () => {
  const bs = g('reset');
  const old = bs.style.background;
  bs.disabled = true;
  bs.style.background = 'darkgray';
  const bss = g('resets');
  bss[S]("class", "spin");
  wl[H] = "Resetting...";

  const sta = { enable: false, ssid: '', pass: '', bssid: '' };
  const config = { wifi: { sta: sta, ap: { enable: true } } };

  rpc_call("Config.Set", (resp) => {
    wl[H] = "Settings changed";
    ESP.restart();
  }, { config, save: true, reboot: true });
};

const toggle_notifications = (e) => {
  console.log(e.target.checked);
};

document.addEventListener('readystatechange', () => {
  if (document.readyState == 'complete') {
    wl = g('wl'), c = g('conn');
    get_info_rpc()
  };
});

const ti = g('toggle');
ti.addEventListener('change', toggle_notifications);

The only change that I have made is to add the following event listener to the toggle switch:

const ti = g('toggle');
ti.addEventListener('change', toggle_notifications);
This event listener will call the toggle_notifications() function when the toggle switch is changed.

The toggle_notifications() function is defined as follows:

const toggle_notifications = (e) => {
  console.log(e.target.checked);
};
This function simply prints the state of the toggle switch to the console. You can modify this function to perform any action that you want when the toggle switch is changed.
*/

const WiFi = require("WiFi");
const esp_http_client = require("esp_http_client");
const g = (i) => document.getElementById(i);
const p = (t, l) => {
  if (confirm(t)) l();
};
const E = (s) => document.createElement(s);
const S = "setAttribute",
  A = "appendChild",
  H = "innerHTML",
  X,
  wl,
  c;

const rpc_call = (method, cb, arg) => {
  const Y = new esp_http_client();
  Y.onreadystatechange = () => {
    if (Y.readyState != XMLHttpRequest.DONE) {
      return false;
    }
    let result = false;
    if (Y.status != 200) {
      if (Y.responseText && Y.responseText.length > 0) {
        const resp = JSON.parse(Y.responseText);
        let s = "";
        Object.keys(resp).forEach((key) => {
          const v = resp[key];
          s = s + "<b>" + key + ":</b> " + v + "<br/>";
        });
        if (s.length) wl[H] = method + " error " + Y.status + "<br/>" + s;
        else wl[H] = method + " error " + Y.status + "<br/>" + Y.responseText;
      } else wl[H] = method + " error (code " + Y.status.toString() + ")";
      setTimeout(() => (wl[H] = ""), 5000);
    } else result = JSON.parse(Y.responseText);
    cb && cb(result, arg);
  };
  Y.open(arg ? "POST" : "GET", "/rpc/" + method, true);
  Y.setRequestHeader("Content-Type", "application/json");
  Y.send(arg ? JSON.stringify(arg) : null);
};

const get_info_rpc = () => {
  // Disabling controls
  c[H] = "not connected";
  const b1 = g("scan");
  const old1 = b1.style.background;
  b1.disabled = true;
  b1.style.background = "darkgray";
  const b2 = g("save");
  const old2 = b2.style.background;
  b2.disabled = true;
  b2.style.background = "darkgray";
  const b3 = g("reset");
  const old3 = b3.style.background;
  b3.disabled = true;
  b3.style.background = "darkgray";
  const si = g("s");
  si.disabled = true;
  const pi = g("p");
  pi.disabled = true;

  rpc_call("Sys.GetInfo", (resp) => {
    // no rpc - fatal, controls disabled
    if (!resp) return;
    let s = "";
    Object.keys(resp).forEach((key) => {
      const v = resp[key];
      if (typeof v === "object") v = JSON.stringify(v);
      s = s + key + ": " + v + "\n";
    });
    g("conn").title = s;
    c[H] =
      "<b>" + resp.app + "</b><br/>v" + resp.fw_version + "<br/>" + resp.id;

    // Enablng controls
    b1.disabled = false;
    b1.style.background = old1;
    b2.disabled = false;
    b2.style.background = old2;
    // Not for captive
    b3.disabled = false;
    b3.style.background = old3;
    si.disabled = false;
    pi.disabled = false;
    scan_rpc();
  });
};

const R = (r) => {
  if (r === 0 || r <= -100) {
    q = 0;
  } else if (r >= -50) {
    q = 100;
  } else {
    q = 2 * (r + 100);
  }
  return q;
};

const scan_rpc = () => {
  const bs = g("scan");
  const old = bs.style.background;
  bs.disabled = true;
  bs.style.background = "darkgray";
  const bss = g("scans");
  bss[S]("class", "spin");
  wl[H] = "Scanning...";
  esp_wifi_scan_start(null, (status, networks) => {
    bs.disabled = false;
    bs.style.background = old;
    bss[S]("class", "");
    if (!networks) return;
    wl[H] = "";
    networks.forEach((e) => {
      const d = E("div"),
        i = E("a"),
        c = E("a");
      i[S]("class", "s");
      c[S]("class", "q");
      i.onclick = () => {
        g("b").innerText = e.bssid;
        g("s").value = e.ssid;
        g("p").focus();
      };
      c.title = e.bssid;
      i[A](document.createTextNode(e.ssid));
      c[H] =
        R(parseInt(e.rssi)) +
        "% " +
        String.fromCodePoint(parseInt(e.auth_mode) == 0 ? 0x26a0 : 0x1f510);
      wl[A](i);
      wl[A](c);
      wl[A](document.createElement("br"));
    });
  });
};

const save_rpc = () => {
  const bs = g("save");
  const old = bs.style.background;
  bs.disabled = true;
  bs.style.background = "darkgray";
  const bss = g("saves");
  bss[S]("class", "spin");
  wl[H] = "Saving...";

  const sta = {
    enable: true,
    ssid: g("s").value,
    pass: g("p").value,
    bssid: g("bssid").checked === true ? g("b").innerText : ""
  };
  const config = { wifi: { sta: sta, ap: { enable: false } } };

  rpc_call(
    "Config.Set",
    (resp) => {
      bs.disabled = false;
      bs.style.background = old;
      bss[S]("class", "");
      if (!resp) return;
      wl[H] = "Configuration saved";
      esp_restart();
    },
    { config, save: true, reboot: true }
  );
};

const reset_rpc = () => {
  const bs = g("reset");
  const old = bs.style.background;
  bs.disabled = true;
  bs.style.background = "darkgray";
  const bss = g("resets");
  bss[S]("class", "spin");
  wl[H] = "Resetting...";

  const sta = { enable: false, ssid: "", pass: "", bssid: "" };
  const config = { wifi: { sta: sta, ap: { enable: true } } };

  rpc_call(
    "Config.Set",
    (resp) => {
      wl[H] = "Settings changed";
      esp_restart();
    },
    { config, save: true, reboot: true }
  );
};

document.addEventListener("readystatechange", () => {
  if (document.readyState == "complete") {
    (wl = g("wl")), (c = g("conn"));
    get_info_rpc();
  }
});
