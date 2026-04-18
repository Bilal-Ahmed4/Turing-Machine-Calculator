# ⚙️ Turing Machine Arithmetic Simulator

A beautiful, interactive **Turing Machine simulator** that performs arithmetic operations using **unary (tally mark) representation** on an infinite tape. Built with vanilla HTML, CSS, and JavaScript — no frameworks required.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![JS](https://img.shields.io/badge/vanilla-JavaScript-yellow)

---

## ✨ Features

### 🔢 Arithmetic Operations
| Operation       | Symbol | Example        | Method                 |
|-----------------|--------|----------------|------------------------|
| Addition        | `+`    | `5 + 3 = 8`   | Direct unary merge     |
| Subtraction     | `−`    | `7 − 3 = 4`   | Paired mark removal    |
| Multiplication  | `×`    | `4 × 3 = 12`  | Repeated addition      |
| Division        | `÷`    | `9 ÷ 3 = 3`   | Repeated subtraction   |

### 🎛️ Simulation Controls
- **Step** — Execute one transition at a time
- **Run** — Auto-execute with adjustable speed
- **Pause** — Freeze the simulation mid-execution
- **Reset** — Clear everything and start fresh
- **Speed Slider** — Control execution speed from slow (educational) to fast

### 📊 Visualizations

#### 🔵 Infinite Tape
- Real-time tape visualization with scrolling
- Active cell highlighting with glow animation
- Head position indicator with smooth tracking
- Cell indices for easy reference

#### 📋 Transition Table
- Complete state transition table for the loaded machine
- Active row highlighting during execution
- Color-coded directions (→ Right, ← Left, • Stay)
- HALT state indicator

#### 🟣 Finite State Machine (FSM) Diagram
- **Interactive SVG state-transition graph**
- Circular node layout with adaptive spacing
- Labeled transitions: `read → write, direction`
- Active state glows during simulation
- Active transition highlights in real-time
- Smart self-loop positioning (away from center)
- Curved bidirectional edges for readability
- Double-ringed HALT state with start arrow on q0

#### 📈 Turing Computation Graph
- **Real-time timeline chart** tracking simulation progress
- **Cyan line** — State changes over time
- **Purple line** — Head position movement
- **Green dots** — Write operations
- Statistics dashboard:
  - States Visited (total steps)
  - Transitions Fired
  - Unique States used
  - Head Travel distance

---

## 🚀 Getting Started

### Quick Start (No Installation Needed)

Since the project uses ES modules, you need a local server:

```bash
# Option 1: Python
python -m http.server 3000

# Option 2: Node.js
npx -y http-server . -p 3000

# Option 3: PHP
php -S localhost:3000
```

Then open **http://localhost:3000** in your browser.

### Usage

1. **Set Operands** — Enter numbers (0–20) for Operand A and B
2. **Choose Operation** — Click `+`, `−`, `×`, or `÷`
3. **Load & Initialize** — Click to prepare the tape and machine
4. **Run or Step** — Watch the Turing Machine compute!
5. **Scroll Down** — View the FSM diagram and computation graph

---

## 📁 Project Structure

```
Turing Machine Emulator/
├── index.html          # Main HTML page with all panel sections
├── style.css           # Complete styling (dark theme, animations)
├── app.js              # Entry point — imports and initializes the app
└── js/
    ├── constants.js    # BLANK, HALT, L, R, S constants
    ├── machines.js     # State machine definitions (4 operations)
    ├── tape.js         # Tape class (infinite tape abstraction)
    ├── turingMachine.js # TuringMachine class (step execution)
    ├── unary.js        # Unary tape string builder
    ├── ui.js           # Main UI controller (DOM, events, rendering)
    └── graph.js        # FSM graph renderer (SVG state diagram)
```

---

## 🧠 How It Works

### Unary Representation

Numbers are represented as sequences of `1`s separated by the operator symbol on the tape:

```
5 + 3  →  #11111+111#
7 − 2  →  #1111111-11#
3 × 4  →  #111*1111#
```

Where `#` is the blank symbol marking tape boundaries.

### State Machine Execution

Each operation has a predefined set of states and transition rules. For example, the **Addition Machine** has 4 states:

| State | Read | Write | Next  | Move  | Purpose                    |
|-------|------|-------|-------|-------|----------------------------|
| q0    | ␣    | ␣     | q1    | → R   | Skip initial blank         |
| q1    | 1    | 1     | q1    | → R   | Scan past first operand    |
| q1    | +    | 1     | q2    | → R   | Replace `+` with `1`      |
| q2    | 1    | 1     | q2    | → R   | Scan past second operand   |
| q2    | ␣    | ␣     | q3    | ← L   | Hit end, go back           |
| q3    | 1    | ␣     | HALT  | • S   | Erase extra `1`, done!     |

### Division via Repeated Subtraction

Division is implemented by repeatedly running the **Subtraction Machine**:
1. Subtract divisor from dividend
2. If result ≥ divisor → increment quotient, subtract again
3. If result < divisor → done! Quotient = number of successful subtractions

---

## 🎨 Design

- **Dark theme** with deep navy/slate color palette
- **Glassmorphism panels** with subtle borders and hover glows
- **Gradient accents** (cyan → purple primary, green for success)
- **Animated particles** background
- **JetBrains Mono** for code/data, **Inter** for UI text
- **Micro-animations** on cells, buttons, and state transitions
- Fully **responsive** layout (mobile-friendly)

---

## 🛠️ Technical Details

- **Pure vanilla** HTML/CSS/JavaScript — zero dependencies
- **ES Modules** for clean code organization
- **SVG rendering** for the FSM state diagram
- **Canvas 2D** for the computation timeline graph
- **High-DPI aware** canvas rendering (devicePixelRatio)
- **Smooth scrolling** tape with auto-centering on active cell

---

## 📝 Theory Background

A **Turing Machine** is a mathematical model of computation defined by:

- **Tape**: An infinite strip of cells, each holding a symbol
- **Head**: Reads/writes one cell at a time, moves left or right
- **State Register**: Stores the current state of the machine
- **Transition Function**: Rules defining (state, read) → (write, next_state, direction)

The machine starts in state `q0`, reads the symbol under the head, looks up the matching transition rule, writes a new symbol, moves the head, and transitions to the next state. It continues until reaching the **HALT** state.

> _"A Turing machine can compute anything that is computable."_ — Church-Turing Thesis

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new operations or features
- Improve the UI/UX
- Add more Turing machine examples

---

<p align="center">
  Built for learning <strong>computation theory</strong> · Turing Machine Arithmetic Simulator
</p>
