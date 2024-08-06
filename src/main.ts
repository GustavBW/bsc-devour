console.log("Running devour v. 0.0.1");

// Get the command-line arguments
const args = process.argv.slice(2);

// Check if there are any arguments
if (args.length === 0) {
  console.log('No arguments provided.');
} else {
  console.log('Arguments:');
  args.forEach((arg, index) => {
    console.log(`${index + 1}: ${arg}`);
  });
}