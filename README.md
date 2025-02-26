# Event Form Filler

This project automates the process of filling out registration forms for events in Denver (sourced from a JSON file) using a language model via the `fillFormWithLLM` function. It’s designed to streamline registration for web3 and tech-related events, such as those tied to ETHDenver 2025.

## Project Overview

- **Purpose**: Automatically fill out event registration forms listed in `data/denver.json` with predefined user information.
- **Key Components**:
  - `index.js`: The main script that reads events from `denver.json` and processes each form.
  - `formFiller.js`: A module (assumed to be provided) containing the `fillFormWithLLM` function.
  - `data/denver.json`: A JSON file containing event details (name, description, and Luma link).

## Prerequisites

- **Node.js**: Version 14.x or higher (tested with Node.js 18.x).
- **Dependencies**: The `formFiller.js` module must be available and export `fillFormWithLLM`.

## Setup

1. **Clone or Create the Project Directory**:
   - Create a directory named `event-form-filler` and navigate into it.

2. **Initialize the Project** (if starting fresh):
   - Run the command to initialize a Node.js project with default settings.


## Usage

1. **Run the Script**:
   - Execute the script using Node.js from the terminal.

2. **Expected Output**:
   - The script logs the start of the process, the total number of events, and progress for each event (processing, URL, success/failure, and completion).

3. **Customization**:
   - Edit the user details in `fillForms.js` to change registration information.
   - Update `denver.json` to modify the list of events.

## Troubleshooting

- **Error: Cannot find module './data/denver.json'**:
  - Ensure `denver.json` exists in the `data` folder.
  - Verify the working directory matches the script’s location by logging the current directory.
  - Fix the path if needed based on your directory structure.

- **Error: Cannot find module './formFiller'**:
  - Confirm `formFiller.js` is in the same directory as `fillForms.js` and exports `fillFormWithLLM`.

- **Form Filling Fails**:
  - Check the URLs in `denver.json` are valid and accessible.
  - Ensure `fillFormWithLLM` supports the form structure on the target site (e.g., Luma event pages).

## Notes

- **Asynchronous Execution**: The script processes events sequentially to avoid overwhelming servers. For parallel processing, consider modifying it with a parallel execution approach.
- **Event Data**: The `denver.json` file is based on events from February 26-28, 2025, in Denver, primarily tied to ETHDenver 2025.

## Contributing

Feel free to fork this project, add enhancements (e.g., error retry logic, parallel processing), and submit pull requests!