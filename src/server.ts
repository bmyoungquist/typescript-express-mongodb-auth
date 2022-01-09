import app from './app';

// Start listening
app.listen(4000, () => {
	console.log(
		`${process.env.APP_NAME} now listening on port ${process.env.PORT}`
	);
});
