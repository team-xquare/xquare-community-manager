const LIMITS = {
	min: 1,
	max: 20,
	titleMax: 200,
	descriptionMax: 2000,
	labelsMax: 10,
	labelLength: 50,
	welcomeMax: 2000,
	uiMessageMax: 2000,
	buttonLabelMax: 80,
	categoryMax: 100,
	reasonMax: 500,
	messageMax: 1900,
};

const LABELS_INPUT_MAX = LIMITS.labelsMax * (LIMITS.labelLength + 1);

module.exports = { LIMITS, LABELS_INPUT_MAX };
