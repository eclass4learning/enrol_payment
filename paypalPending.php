<?php

require("../../config.php");

$id=required_param('id', PARAM_INT);

$context = context_course::instance($id, MUST_EXIST);
$PAGE->set_context($context);

$PAGE->set_url("$CFG->wwwroot/enrol/payment/paypalPending.php");

$supportemaillink = $CFG->supportemail ? "<a href=\"mailto:$CFG->supportemail\">contact</a>" : "contact";

echo $OUTPUT->header();
echo '<div style="text-align: center;" class="paypal-pending">';
echo $OUTPUT->box(get_string('errorpaymentpending', 'enrol_payment', $supportemaillink), 'generalbox', 'notice');
echo '</div>';
echo $OUTPUT->footer();
