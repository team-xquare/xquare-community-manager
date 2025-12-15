const policies = {
	ValidationError: {
		logLevel: 'warn',
		userMessage: '입력값을 확인해주세요.',
		expose: true,
	},
	NotFoundError: {
		logLevel: 'warn',
		userMessage: '대상을 찾을 수 없습니다.',
		expose: true,
	},
	ConflictError: {
		logLevel: 'warn',
		userMessage: '이미 처리된 요청입니다.',
		expose: true,
	},
	ExternalServiceError: {
		logLevel: 'error',
		userMessage: '외부 서비스 처리 중 오류가 발생했습니다.',
		expose: false,
	},
	UnexpectedError: {
		logLevel: 'error',
		userMessage: '알 수 없는 오류가 발생했습니다.',
		expose: false,
	},
};

module.exports = policies;
