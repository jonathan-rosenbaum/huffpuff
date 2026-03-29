// ============================================
// SABRIDLE - Game Engine
// ============================================

(function () {
    "use strict";

    // --- State ---
    let solution = null;       // current solution object
    let board = [];            // array of 6 rows, each row is array of letters
    let currentRow = 0;
    let currentCol = 0;
    let gameOver = false;
    let revealedPositions = new Set(); // tracks which letter positions have been revealed green
    let usedSolutions = [];    // track which puzzles have been played

    // --- Valid word list ---
    // We'll use a permissive check — accept any 5-letter alpha string
    // For a stricter check, you could load a word list
    const STRICT_WORD_CHECK = false;

    // --- Init ---
    function init() {
        pickSolution();
        createBoard();
        createKeyboard();
        createAcrosticBar();
        addToast();
        bindEvents();
    }

    function pickSolution() {
        // Pick a random solution that hasn't been played recently
        let available = SOLUTIONS.filter(s => !usedSolutions.includes(s.word));
        if (available.length === 0) {
            usedSolutions = [];
            available = SOLUTIONS;
        }
        solution = available[Math.floor(Math.random() * available.length)];
        usedSolutions.push(solution.word);
    }

    // --- Board ---
    function createBoard() {
        const boardEl = document.getElementById("board");
        boardEl.innerHTML = "";
        board = [];
        for (let r = 0; r < 6; r++) {
            const rowEl = document.createElement("div");
            rowEl.className = "row";
            const rowData = [];
            for (let c = 0; c < 5; c++) {
                const tile = document.createElement("div");
                tile.className = "tile";
                tile.id = `tile-${r}-${c}`;
                rowEl.appendChild(tile);
                rowData.push("");
            }
            boardEl.appendChild(rowEl);
            board.push(rowData);
        }
    }

    // --- Keyboard ---
    function createKeyboard() {
        const kbEl = document.getElementById("keyboard");
        kbEl.innerHTML = "";
        const rows = [
            ["Q","W","E","R","T","Y","U","I","O","P"],
            ["A","S","D","F","G","H","J","K","L"],
            ["ENTER","Z","X","C","V","B","N","M","DEL"]
        ];
        rows.forEach(row => {
            const rowEl = document.createElement("div");
            rowEl.className = "kb-row";
            row.forEach(key => {
                const btn = document.createElement("button");
                btn.className = "key" + (key.length > 1 ? " wide" : "");
                btn.dataset.key = key;
                btn.textContent = key === "DEL" ? "\u232B" : key;
                btn.addEventListener("click", () => handleKey(key));
                rowEl.appendChild(btn);
            });
            kbEl.appendChild(rowEl);
        });
    }

    // --- Acrostic Bar ---
    function createAcrosticBar() {
        const bar = document.getElementById("acrostic-bar");
        const wordsEl = document.getElementById("acrostic-words");
        wordsEl.innerHTML = "";
        solution.acrostic.forEach((word, i) => {
            const span = document.createElement("span");
            span.className = "acrostic-word";
            span.id = `acrostic-${i}`;
            span.innerHTML = `<span class="first-letter">${word[0]}</span>${word.slice(1)}`;
            wordsEl.appendChild(span);
        });
        bar.classList.remove("hidden");
        // Reset revealed state
        revealedPositions = new Set();
    }

    // --- Toast ---
    function addToast() {
        if (!document.getElementById("toast")) {
            const toast = document.createElement("div");
            toast.id = "toast";
            document.body.appendChild(toast);
        }
    }

    function showToast(msg, duration = 1500) {
        const toast = document.getElementById("toast");
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), duration);
    }

    // --- Events ---
    function bindEvents() {
        document.addEventListener("keydown", (e) => {
            if (gameOver) return;
            if (e.key === "Enter") handleKey("ENTER");
            else if (e.key === "Backspace") handleKey("DEL");
            else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
        });

        document.getElementById("play-again-btn").addEventListener("click", resetGame);
    }

    function handleKey(key) {
        if (gameOver) return;

        if (key === "DEL") {
            if (currentCol > 0) {
                currentCol--;
                board[currentRow][currentCol] = "";
                updateTile(currentRow, currentCol, "");
            }
            return;
        }

        if (key === "ENTER") {
            if (currentCol < 5) {
                showToast("Not enough letters");
                shakeRow(currentRow);
                return;
            }
            submitGuess();
            return;
        }

        // Letter
        if (currentCol < 5) {
            board[currentRow][currentCol] = key;
            updateTile(currentRow, currentCol, key, true);
            currentCol++;
        }
    }

    function updateTile(row, col, letter, animate = false) {
        const tile = document.getElementById(`tile-${row}-${col}`);
        tile.textContent = letter;
        if (letter) {
            tile.classList.add("filled");
        } else {
            tile.classList.remove("filled");
        }
    }

    function shakeRow(row) {
        const rowEl = document.getElementById("board").children[row];
        rowEl.classList.add("shake");
        setTimeout(() => rowEl.classList.remove("shake"), 500);
    }

    // --- Submit Guess ---
    function submitGuess() {
        const guess = board[currentRow].join("");
        const target = solution.word;

        // Evaluate matches
        const result = evaluateGuess(guess, target);

        // Animate reveal
        revealRow(currentRow, result, () => {
            // Update keyboard colors
            updateKeyboard(guess, result);

            // Determine message type and show message
            const hasGreen = result.includes("correct");
            const hasYellow = result.includes("present");
            const solved = guess === target;

            if (solved) {
                // Reveal any remaining acrostic words
                for (let i = 0; i < 5; i++) {
                    revealAcrosticWord(i);
                }
                showMessage(randomFrom(SOLVE_MESSAGES));
                gameOver = true;
                setTimeout(() => showCelebration(), 2000);
                return;
            }

            // Show trigger word message or category message
            const triggerMsg = TRIGGER_WORDS[guess];
            if (triggerMsg) {
                showMessage(triggerMsg);
            } else if (hasGreen) {
                showMessage(randomFrom(GREEN_MESSAGES));
            } else if (hasYellow) {
                showMessage(randomFrom(YELLOW_MESSAGES));
            } else {
                showMessage(randomFrom(MISS_MESSAGES));
            }

            // Reveal green acrostic words and photos
            result.forEach((r, i) => {
                if (r === "correct" && !revealedPositions.has(i)) {
                    revealedPositions.add(i);
                    revealAcrosticWord(i);
                    showPhoto(i);
                }
            });

            currentRow++;
            currentCol = 0;

            // Out of guesses
            if (currentRow >= 6) {
                gameOver = true;
                showMessage(`The word was ${target}!`);
                setTimeout(() => {
                    // Still show celebration — it's her birthday!
                    showCelebration();
                }, 2500);
            }
        });
    }

    function evaluateGuess(guess, target) {
        const result = Array(5).fill("absent");
        const targetArr = target.split("");
        const guessArr = guess.split("");
        const used = Array(5).fill(false);

        // First pass: correct positions
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = "correct";
                used[i] = true;
            }
        }

        // Second pass: present but wrong position
        for (let i = 0; i < 5; i++) {
            if (result[i] === "correct") continue;
            for (let j = 0; j < 5; j++) {
                if (!used[j] && guessArr[i] === targetArr[j]) {
                    result[i] = "present";
                    used[j] = true;
                    break;
                }
            }
        }

        return result;
    }

    // --- Reveal Animation ---
    function revealRow(row, result, callback) {
        const tiles = [];
        for (let c = 0; c < 5; c++) {
            tiles.push(document.getElementById(`tile-${row}-${c}`));
        }

        let i = 0;
        function revealNext() {
            if (i >= 5) {
                if (callback) setTimeout(callback, 200);
                return;
            }
            const tile = tiles[i];
            tile.classList.add("reveal");
            // Apply color at midpoint of flip
            setTimeout(() => {
                tile.classList.add(result[i]);
                i++;
                revealNext();
            }, 250);
        }
        revealNext();
    }

    // --- Keyboard Update ---
    function updateKeyboard(guess, result) {
        const priority = { "correct": 3, "present": 2, "absent": 1 };
        for (let i = 0; i < 5; i++) {
            const letter = guess[i];
            const btn = document.querySelector(`.key[data-key="${letter}"]`);
            if (!btn) continue;
            const current = btn.classList.contains("correct") ? 3 :
                           btn.classList.contains("present") ? 2 :
                           btn.classList.contains("absent") ? 1 : 0;
            if (priority[result[i]] > current) {
                btn.classList.remove("correct", "present", "absent");
                btn.classList.add(result[i]);
            }
        }
    }

    // --- Messages ---
    function showMessage(text) {
        const bar = document.getElementById("message-bar");
        const textEl = document.getElementById("message-text");
        textEl.textContent = text;
        bar.classList.remove("hidden");
        bar.style.opacity = "0";
        bar.style.transform = "translateY(-10px)";
        requestAnimationFrame(() => {
            bar.style.opacity = "1";
            bar.style.transform = "translateY(0)";
        });
    }

    // --- Photo Reveal ---
    function showPhoto(position) {
        const photoEl = document.getElementById("photo-reveal");
        const img = document.getElementById("photo-img");

        // Check if photo exists by trying to load it
        const testImg = new Image();
        testImg.onload = () => {
            img.src = solution.photos[position];
            photoEl.classList.remove("hidden");
            photoEl.style.opacity = "0";
            photoEl.style.transform = "scale(0.8)";
            requestAnimationFrame(() => {
                photoEl.style.opacity = "1";
                photoEl.style.transform = "scale(1)";
            });
            // Hide after a few seconds
            setTimeout(() => {
                photoEl.style.opacity = "0";
                setTimeout(() => photoEl.classList.add("hidden"), 500);
            }, 3000);
        };
        testImg.onerror = () => {
            // Photo not found — skip silently
            // (photos haven't been added yet)
        };
        testImg.src = solution.photos[position];
    }

    // --- Acrostic ---
    function revealAcrosticWord(position) {
        const el = document.getElementById(`acrostic-${position}`);
        if (el) {
            el.classList.add("revealed");
        }
    }

    // --- Celebration ---
    function showCelebration() {
        const overlay = document.getElementById("celebration-overlay");
        const title = document.getElementById("celeb-title");
        const acrosticEl = document.getElementById("celeb-acrostic");
        const photosEl = document.getElementById("celeb-photos");
        const messageEl = document.getElementById("celeb-message");

        title.textContent = `${solution.word}!`;

        // Build acrostic display
        acrosticEl.innerHTML = "";
        solution.acrostic.forEach(word => {
            const line = document.createElement("span");
            line.className = "acrostic-line";
            line.innerHTML = `<span class="highlight">${word[0]}</span>${word.slice(1)} `;
            acrosticEl.appendChild(line);
        });

        // Build photo grid
        photosEl.innerHTML = "";
        solution.photos.forEach(src => {
            const img = new Image();
            img.src = src;
            img.onerror = () => img.remove(); // hide missing photos
            photosEl.appendChild(img);
        });

        messageEl.textContent = solution.celebrationMessage;

        overlay.classList.remove("hidden");
        requestAnimationFrame(() => {
            overlay.classList.add("visible");
        });

        // Fire confetti
        launchConfetti();
    }

    // --- Confetti ---
    function launchConfetti() {
        const canvas = document.getElementById("confetti-canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ["#b485d1", "#6aaa64", "#c9b458", "#ff6b9d", "#45b7d1", "#f7dc6f", "#ff8c42"];
        const pieces = [];

        for (let i = 0; i < 120; i++) {
            pieces.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: Math.random() * 2 - 1,
                rot: Math.random() * 360,
                rotSpeed: Math.random() * 6 - 3
            });
        }

        let frame = 0;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.y += p.vy;
                p.x += p.vx;
                p.rot += p.rotSpeed;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            frame++;
            if (frame < 300) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        animate();
    }

    // --- Reset ---
    function resetGame() {
        gameOver = false;
        currentRow = 0;
        currentCol = 0;

        // Hide celebration
        const overlay = document.getElementById("celebration-overlay");
        overlay.classList.remove("visible");
        setTimeout(() => overlay.classList.add("hidden"), 800);

        // Hide message and photo
        document.getElementById("message-bar").classList.add("hidden");
        document.getElementById("photo-reveal").classList.add("hidden");

        // Pick new solution
        pickSolution();
        createBoard();
        createKeyboard();
        createAcrosticBar();
    }

    // --- Utility ---
    function randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- Start ---
    init();
})();
