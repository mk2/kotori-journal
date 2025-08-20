# Image Paste Journal Feature Requirements

## Overview
This document defines the requirements for implementing image paste functionality in KotoriJournal, allowing individual users to record journal entries by pasting images into the console interface.

## EARS Format Requirements

### 画像ペースト機能

1. **WHEN** a user pastes an image into the console, **the KotoriJournal SHALL** accept PNG and JPEG format images only.

2. **WHEN** a user pastes a valid image, **the KotoriJournal SHALL** display a preview of the image in the terminal.

3. **WHEN** a user pastes an image, **the KotoriJournal SHALL** save the image file to the `$HOME/.kotori-journal-data` directory.

4. **WHEN** a user pastes an image, **the KotoriJournal SHALL** record the current timestamp as journal metadata.

5. **WHEN** a user pastes an image, **the KotoriJournal SHALL** create a journal entry with the image and timestamp.

### 日報連携機能

6. **WHEN** journal entries are converted to daily reports, **the KotoriJournal SHALL** include proper markdown image links for all image entries.

7. **WHEN** generating markdown for daily reports, **the KotoriJournal SHALL** reference image files using relative paths to the data directory.

### エラーハンドリング

8. **WHEN** a user attempts to paste an unsupported image format, **the KotoriJournal SHALL** display an error message indicating supported formats.

9. **WHEN** the data directory is not accessible, **the KotoriJournal SHALL** display an error message and prevent image saving.

### 使いやすさ要件

10. **WHILE** displaying image previews, **the KotoriJournal SHALL** maintain readable terminal output formatting.

11. **WHEN** processing image paste operations, **the KotoriJournal SHALL** complete the operation within 2 seconds for typical image sizes.

## Technical Context

- **Target System**: KotoriJournal
- **Target Users**: Individual users
- **Storage Location**: `$HOME/.kotori-journal-data` directory
- **Supported Formats**: PNG, JPEG
- **Integration**: Daily report markdown generation with image links
- **Performance**: 2-second maximum processing time for typical images