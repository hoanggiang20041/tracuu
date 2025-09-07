// TOTP Implementation theo chuẩn RFC6238
// Dựa trên otpauth library: https://otp.authlib.org/recipes/

class TOTPAuth {
    constructor(secret, options = {}) {
        this.secret = secret;
        this.digits = options.digits || 6;
        this.algorithm = options.algorithm || 'SHA1';
        this.period = options.period || 30;
        this.window = options.window || 1;
    }

    // Tạo TOTP instance từ base32 secret
    static fromBase32(secret, options = {}) {
        const decodedSecret = this.base32Decode(secret);
        return new TOTPAuth(decodedSecret, options);
    }

    // Tạo mã TOTP cho thời điểm hiện tại
    generate(time = null) {
        if (time === null) {
            time = Math.floor(Date.now() / 1000);
        }
        const counter = Math.floor(time / this.period);
        return this.hotp(counter);
    }

    // Xác thực mã TOTP
    verify(code, time = null) {
        if (time === null) {
            time = Math.floor(Date.now() / 1000);
        }
        
        const counter = Math.floor(time / this.period);
        
        // Kiểm tra trong window
        for (let i = -this.window; i <= this.window; i++) {
            const testCounter = counter + i;
            const expectedCode = this.hotp(testCounter);
            if (expectedCode === code.toString()) {
                return true;
            }
        }
        
        return false;
    }

    // Tạo HOTP code
    hotp(counter) {
        const key = this.secret;
        const counterBytes = this.intToBytes(counter, 8);
        const hmac = this.hmacSha1(key, counterBytes);
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                    ((hmac[offset + 1] & 0xff) << 16) |
                    ((hmac[offset + 2] & 0xff) << 8) |
                    (hmac[offset + 3] & 0xff);
        
        const otp = code % Math.pow(10, this.digits);
        return otp.toString().padStart(this.digits, '0');
    }

    // Tạo URI cho authenticator app
    toURI(label, issuer) {
        const secret = this.base32Encode(this.secret);
        const params = new URLSearchParams({
            secret: secret,
            issuer: issuer,
            algorithm: this.algorithm,
            digits: this.digits.toString(),
            period: this.period.toString()
        });
        
        return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
    }

    // Base32 decode
    static base32Decode(str) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const padding = '=';
        
        // Remove padding
        str = str.replace(new RegExp(padding + '+$'), '');
        
        let bits = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i].toUpperCase();
            const index = alphabet.indexOf(char);
            if (index === -1) continue;
            bits += index.toString(2).padStart(5, '0');
        }
        
        // Convert bits to bytes
        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            const byte = bits.substring(i, i + 8);
            if (byte.length === 8) {
                bytes.push(parseInt(byte, 2));
            }
        }
        
        return new Uint8Array(bytes);
    }

    // Base32 encode
    base32Encode(bytes) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        
        for (let i = 0; i < bytes.length; i++) {
            bits += bytes[i].toString(2).padStart(8, '0');
        }
        
        // Pad to multiple of 5
        while (bits.length % 5 !== 0) {
            bits += '0';
        }
        
        let result = '';
        for (let i = 0; i < bits.length; i += 5) {
            const chunk = bits.substring(i, i + 5);
            const index = parseInt(chunk, 2);
            result += alphabet[index];
        }
        
        // Add padding
        while (result.length % 8 !== 0) {
            result += '=';
        }
        
        return result;
    }

    // Convert integer to bytes
    intToBytes(num, length) {
        const bytes = new Uint8Array(length);
        for (let i = length - 1; i >= 0; i--) {
            bytes[i] = num & 0xff;
            num >>>= 8;
        }
        return bytes;
    }

    // HMAC-SHA1 implementation
    hmacSha1(key, message) {
        const blockSize = 64;
        const keyBytes = new Uint8Array(key);
        
        // Pad key to block size
        let paddedKey = new Uint8Array(blockSize);
        if (keyBytes.length > blockSize) {
            // Hash key if too long
            const hashedKey = this.sha1(keyBytes);
            paddedKey.set(hashedKey);
        } else {
            paddedKey.set(keyBytes);
        }
        
        // Create inner and outer keys
        const innerKey = new Uint8Array(blockSize);
        const outerKey = new Uint8Array(blockSize);
        
        for (let i = 0; i < blockSize; i++) {
            innerKey[i] = paddedKey[i] ^ 0x36;
            outerKey[i] = paddedKey[i] ^ 0x5c;
        }
        
        // Create inner hash
        const innerData = new Uint8Array(blockSize + message.length);
        innerData.set(innerKey);
        innerData.set(message, blockSize);
        const innerHash = this.sha1(innerData);
        
        // Create outer hash
        const outerData = new Uint8Array(blockSize + innerHash.length);
        outerData.set(outerKey);
        outerData.set(innerHash, blockSize);
        const outerHash = this.sha1(outerData);
        
        return outerHash;
    }

    // SHA1 implementation
    sha1(data) {
        // Convert to 32-bit words
        const words = [];
        for (let i = 0; i < data.length; i += 4) {
            let word = 0;
            for (let j = 0; j < 4 && i + j < data.length; j++) {
                word |= (data[i + j] << (24 - j * 8));
            }
            words.push(word >>> 0);
        }
        
        // Add padding
        const bitLength = data.length * 8;
        words.push(0x80000000);
        
        while ((words.length * 32) % 512 !== 448) {
            words.push(0);
        }
        
        words.push(0);
        words.push(bitLength >>> 0);
        
        // Initialize hash values
        let h0 = 0x67452301;
        let h1 = 0xEFCDAB89;
        let h2 = 0x98BADCFE;
        let h3 = 0x10325476;
        let h4 = 0xC3D2E1F0;
        
        // Process chunks
        for (let chunk = 0; chunk < words.length; chunk += 16) {
            const w = words.slice(chunk, chunk + 16);
            
            // Extend the 16 words into 80 words
            for (let i = 16; i < 80; i++) {
                w[i] = this.rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
            }
            
            let a = h0, b = h1, c = h2, d = h3, e = h4;
            
            // Main loop
            for (let i = 0; i < 80; i++) {
                let f, k;
                if (i < 20) {
                    f = (b & c) | ((~b) & d);
                    k = 0x5A827999;
                } else if (i < 40) {
                    f = b ^ c ^ d;
                    k = 0x6ED9EBA1;
                } else if (i < 60) {
                    f = (b & c) | (b & d) | (c & d);
                    k = 0x8F1BBCDC;
                } else {
                    f = b ^ c ^ d;
                    k = 0xCA62C1D6;
                }
                
                const temp = (this.rotateLeft(a, 5) + f + e + k + w[i]) >>> 0;
                e = d;
                d = c;
                c = this.rotateLeft(b, 30);
                b = a;
                a = temp;
            }
            
            h0 = (h0 + a) >>> 0;
            h1 = (h1 + b) >>> 0;
            h2 = (h2 + c) >>> 0;
            h3 = (h3 + d) >>> 0;
            h4 = (h4 + e) >>> 0;
        }
        
        // Convert to bytes
        const hash = new Uint8Array(20);
        const h = [h0, h1, h2, h3, h4];
        for (let i = 0; i < 5; i++) {
            hash[i * 4] = (h[i] >>> 24) & 0xff;
            hash[i * 4 + 1] = (h[i] >>> 16) & 0xff;
            hash[i * 4 + 2] = (h[i] >>> 8) & 0xff;
            hash[i * 4 + 3] = h[i] & 0xff;
        }
        
        return hash;
    }

    // Rotate left
    rotateLeft(value, amount) {
        return ((value << amount) | (value >>> (32 - amount))) >>> 0;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TOTPAuth;
} else {
    window.TOTPAuth = TOTPAuth;
}
