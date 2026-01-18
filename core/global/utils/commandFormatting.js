const formatLabels = (labels, emptyMessage) => labels?.length ? labels.map(label => `\`${label}\``).join(', ') : emptyMessage;
const formatAssignees = (assignees, emptyMessage) => assignees?.length ? assignees.map(id => `<@${id}>`).join(', ') : emptyMessage;

module.exports = {
	formatLabels,
	formatAssignees,
};
