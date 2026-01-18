module.exports = {
	common: {
		defaultValue: '기본값',
		unset: '미설정',
		none: '없음',
		unassigned: '미지정',
		unknown: '알 수 없음',
		noPermission: '이 명령을 실행할 권한이 없습니다.',
		userNotFound: '사용자를 찾을 수 없습니다.',
		unknownCommand: '알 수 없는 명령입니다.',
	},
	errors: {
		validation: '입력값을 확인해주세요.',
		notFound: '대상을 찾을 수 없습니다.',
		conflict: '이미 처리된 요청입니다.',
		external: '외부 서비스 처리 중 오류가 발생했습니다.',
		unexpected: '알 수 없는 오류가 발생했습니다.',
		generic: '오류가 발생했습니다.',
	},
	support: {
		command: {
			description: '지원 티켓을 생성하거나 조회합니다.',
		},
	},
	operation: {
		command: {
			description: '티켓 운영 작업을 수행합니다.',
		},
	},
	configuration: {
		command: {
			description: '티켓 설정을 관리합니다.',
		},
	},
	ticket: {
		command: {
			description: '티켓을 생성하거나 설정을 관리합니다.',
		},
		group: {
			description: '티켓',
		},
		subcommand: {
			open: {
				description: '티켓 생성 UI를 표시합니다.',
				option: {
					title: '티켓 제목',
					description: '티켓 설명',
					labels: '콤마(,)로 구분된 라벨들',
					assignee: '담당자',
				},
			},
			set: {
				description: '티켓 설정을 변경합니다.',
				option: {
					channelPrefix: '티켓 채널 접두사를 설정합니다.',
					numberPad: '티켓 번호 패딩 길이(1~6).',
					creationChannel: '티켓 생성 UI를 게시할 채널.',
					welcomeMessage: '티켓 채널 환영 메시지. {user}를 포함하면 사용자 멘션으로 대체됩니다.',
					uiMessage: '티켓 생성 버튼 안내 메시지. {user}를 포함하면 사용자 멘션으로 대체됩니다.',
					buttonLabel: '티켓 생성 버튼 라벨.',
					defaultLabels: '기본 라벨(콤마로 구분)',
					openCategory: '티켓 채널을 생성할 카테고리.',
					closeCategory: '삭제한 티켓이 옮겨질 카테고리.',
				},
			},
			publishUi: {
				description: '설정된 채널에 티켓 생성 UI를 게시합니다.',
			},
			close: {
				description: '현재 티켓을 종료합니다.',
				option: {
					reason: '종료 사유',
				},
			},
			reopen: {
				description: '현재 티켓을 다시 엽니다.',
			},
			info: {
				description: '현재 티켓 정보를 확인합니다.',
			},
			addLabel: {
				description: '티켓에 라벨을 추가합니다.',
				option: {
					labels: '추가할 라벨(콤마로 구분)',
				},
			},
			removeLabel: {
				description: '티켓에서 라벨을 제거합니다.',
				option: {
					labels: '제거할 라벨(콤마로 구분)',
				},
			},
			assign: {
				description: '티켓 담당자를 지정합니다.',
				option: {
					user: '담당자',
				},
			},
			unassign: {
				description: '티켓 담당자를 해제합니다.',
				option: {
					user: '해제할 담당자',
				},
			},
			list: {
				description: '티켓 목록을 조회합니다.',
				option: {
					status: '상태 필터',
					label: '라벨 필터',
					assignee: '담당자 필터',
					limit: '최대 조회 개수(1~20)',
				},
			},
			addParticipant: {
				description: '관련자를 추가합니다.',
				option: {
					user: '관련자',
				},
			},
			removeParticipant: {
				description: '관련자를 제거합니다.',
				option: {
					user: '제거할 관련자',
				},
			},
		},
		response: {
			created: '티켓이 생성되었습니다: <#{channelId}>',
			createError: '티켓 생성 중 오류가 발생했습니다.',
			settingsUpdated: '티켓 설정이 업데이트되었습니다.',
			settingsUpdateError: '설정 업데이트 중 오류가 발생했습니다.',
			closeScheduled: '티켓을 {minutes}분 후 종료합니다.',
			closeError: '티켓 종료 중 오류가 발생했습니다.',
			reopenSuccess: '티켓을 다시 열었습니다.',
			reopenError: '티켓 재오픈 중 오류가 발생했습니다.',
			infoNotFound: '이 채널에서 티켓을 찾을 수 없습니다.',
			infoError: '티켓 정보 조회 중 오류가 발생했습니다.',
			noLabelsToAdd: '추가할 라벨이 없습니다.',
			labelsAdded: '라벨이 추가되었습니다. 현재 라벨: {labels}',
			labelsAddError: '라벨 추가 중 오류가 발생했습니다.',
			noLabelsToRemove: '제거할 라벨이 없습니다.',
			labelsRemoved: '라벨이 제거되었습니다. 현재 라벨: {labels}',
			labelsRemoveError: '라벨 제거 중 오류가 발생했습니다.',
			assigneeAssigned: '담당자가 지정되었습니다. 현재 담당자: {assignees}',
			assigneeAssignError: '담당자 지정 중 오류가 발생했습니다.',
			assigneeUnassigned: '담당자가 해제되었습니다. 현재 담당자: {assignees}',
			assigneeUnassignError: '담당자 해제 중 오류가 발생했습니다.',
			noTickets: '조건에 맞는 티켓이 없습니다.',
			listError: '티켓 목록 조회 중 오류가 발생했습니다.',
			publishSuccess: '티켓 생성 UI를 게시했습니다.',
			publishError: '티켓 생성 UI 게시 중 오류가 발생했습니다.',
			adminOnlyClose: '관리자만 티켓을 닫을 수 있습니다.',
			adminOnlyReopen: '관리자만 티켓을 다시 열 수 있습니다.',
			adminOnlyModifyLabels: '관리자만 라벨을 수정할 수 있습니다.',
			adminOnlyAssign: '관리자만 담당자를 지정할 수 있습니다.',
			adminOnlyUnassign: '관리자만 담당자를 해제할 수 있습니다.',
			adminOnlyList: '관리자만 티켓 목록을 조회할 수 있습니다.',
			participantPermission: '작성자 또는 관리자만 관련자를 수정할 수 있습니다.',
			participantAdded: '관련자가 추가되었습니다. 현재 관련자: {participants}',
			participantRemoved: '관련자가 제거되었습니다. 현재 관련자: {participants}',
			participantAddError: '관련자 추가 중 오류가 발생했습니다.',
			participantRemoveError: '관련자 제거 중 오류가 발생했습니다.',
		},
		settings: {
			line: {
				channelPrefix: '채널 접두사: {value}',
				numberPad: '번호 패딩: {value}',
				creationChannel: '생성 UI 채널: {value}',
				welcomeMessage: '티켓 환영 메시지: {value}',
				uiMessage: 'UI 안내 메시지: {value}',
				buttonLabel: '버튼 라벨: {value}',
				defaultLabels: '기본 라벨: {value}',
				openCategory: '채널 생성 카테고리: {value}',
				closeCategory: '채널 닫힘 카테고리: {value}',
			},
		},
		info: {
			number: '번호: #{ticketNumber}',
			title: '제목: {title}',
			status: '상태: {status}',
			author: '작성자: <@{userId}>',
			assignees: '담당자: {assignees}',
			labels: '라벨: {labels}',
			description: '설명: {description}',
			closedAt: '종료 시각: {timestamp}',
			createdAt: '생성 시각: {timestamp}',
		},
		list: {
			item: '#{ticketNumber} [{status}] {title} | {labels} | {assignees} | {channel}',
		},
		defaults: {
			title: '제목 없음',
			welcome: '{user} 님의 티켓이 생성되었습니다. 문의 내용을 작성해주세요.',
			uiMessage: '티켓을 생성하려면 아래 버튼을 눌러주세요.',
			buttonLabel: '티켓 생성',
		},
		errors: {
			settingsIncomplete: '티켓 설정이 완전하지 않습니다. 누락된 항목: {fields}',
			adminOnlyClose: '관리자만 티켓을 닫을 수 있습니다.',
			ticketNotFound: '티켓을 찾을 수 없습니다.',
			alreadyClosed: '이미 종료된 티켓입니다.',
			alreadyClosing: '이미 종료 대기 중입니다.',
			categoryFull: '카테고리 채널이 가득 차서 새로운 채널을 만들 수 없습니다.',
		},
		lifecycle: {
			reasonLine: '\n이유: {reason}',
			closed: '티켓이 종료되었습니다.{reason}',
			closeScheduled: '티켓이 {time}에 종료됩니다.\n담당자 : {assignees} / 작성자 : <@{authorId}>',
			reopened: '티켓이 다시 열렸습니다. 요청자: <@{userId}>',
		},
		migration: {
			start: '티켓 카운터 마이그레이션을 시작합니다.',
			noTickets: '기존 티켓이 없어 카운터 마이그레이션을 건너뜁니다.',
			skipped: '티켓 카운터가 이미 최신 상태입니다.',
			updated: '티켓 카운터를 {from} -> {to}로 갱신했습니다.',
			failed: '티켓 카운터 마이그레이션에 실패했습니다.',
		},
		ui: {
			buttonLabel: '티켓 생성',
			publishPrompt: '티켓을 생성하려면 아래 버튼을 눌러주세요.',
			selectPlaceholder: '이슈 종류를 선택해주세요',
			selectPrompt: '아래에서 이슈 종류를 선택해주세요.',
			missingChannel: '티켓 생성 UI 채널이 설정되지 않았습니다. /configuration ticket set creation_channel 로 설정해주세요.',
			channelNotFound: '설정된 생성 채널을 찾을 수 없습니다.',
		},
		modal: {
			title: '티켓 생성',
			field: {
				title: '제목',
				description: '설명',
			},
		},
		summary: {
			field: {
				status: '상태',
				labels: '라벨',
				assignees: '담당자',
				created: '생성',
			},
		},
		status: {
			closed: 'closed',
			closing: 'closing {minutesLeft}분 후',
			inProgress: 'in-progress',
			open: 'open',
		},
		message: {
			descriptionLine: '설명: {description}',
		},
	},
};
