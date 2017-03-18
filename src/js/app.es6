import $ from "jquery";
import foundation from "foundation-sites";
import CryptoJS from "crypto-js/crypto-js";
import AES from "crypto-js/aes";
import UTF8 from "crypto-js/enc-utf8";
import Base64 from "crypto-js/enc-base64";
import Latin1 from "crypto-js/enc-latin1";

$(document).foundation();

const padString = (source) => {
    const size = 16;
    const x = source.length % size;
    const padLength = size - x;

    for (var i = 0; i < padLength; i++) {
        source += String.fromCharCode(0);
    }

    return source;
};

$("#post_form").on("submit", (e) => {
    const text = padString($(e.currentTarget).find("textarea").val());
    const captcha = $(e.currentTarget).find("input[type='text']").val();
    const alphanum = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const chars = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz[\\]^_`¡¢£¤¥§¦¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ";

    let values = new Uint32Array(32);
    window.crypto.getRandomValues(values);

    let key = "";

    for (let value of values) {
        key += alphanum[value % alphanum.length];
    }

    values = new Uint32Array(16);
    window.crypto.getRandomValues(values);
    let nonce = "";

    for (let value of values) {
        nonce += chars[value % chars.length];
    }

    const encrypted = AES.encrypt(text, UTF8.parse(key), {
        iv: Latin1.parse(nonce),
        padding: CryptoJS.pad.NoPadding,
        mode: CryptoJS.mode.CBC
    });

    const encryptString = btoa(nonce + atob(encrypted.toString()));

    $.post("/submit/js", {"encrypted": encryptString, "captcha": captcha}, (res) => {
        res = JSON.parse(res);
        console.log(`/view/${res.id}#${key}`);
    });

    e.preventDefault();
});

const textbox = $("#encrypted_data");

if (textbox.length) {
    const raw = textbox.text();
    const ciphertext = Base64.parse(raw);

    const iv = ciphertext.clone();
    iv.sigBytes = 16;
    iv.clamp();
    ciphertext.words.splice(0, 4);
    ciphertext.sigBytes -= 16;

    const decrypted = AES.decrypt({ ciphertext: ciphertext },
        UTF8.parse(window.location.hash.substr(1)),
        { iv: iv, mode: CryptoJS.mode.CBC }
    );

    const text = decrypted.toString(UTF8);

    if (text == "") {
        textbox.text("Decryption failed. Do you have the right key? Ensure you pasted" +
            " the URL correctly including everything after the #. This paste has now" +
            " been destroyed.");
    } else {
        textbox.text(text.replaceAll('\\n', String.fromCharCode(13, 10)));
    }
}

const urlInput = $("input[type='url']");

if (urlInput.length) {
    if (window.location.hash != "") {
        urlInput.val(urlInput.val().substr(urlInput.val().indexOf('#')) + window.location.hash);
    }
}
