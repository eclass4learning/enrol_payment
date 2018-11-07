<?php

require_once(dirname(__FILE__).'/../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once('util.php');

$courseid = $_POST['courseid'];
$paymentid = $_POST['paymentid'];

$context = context_course::instance($courseid, MUST_EXIST);

if (is_enrolled($context, NULL, '', true)) {
    echo json_encode([
        "status" => "success",
        "result" => true
    ]);

} else if(payment_pending($paymentid)) {
    echo json_encode([
        "status" => "success",
        "result" => false,
        "reason" => "Pending"
    ]);
} else {
    $reason = get_payment_status($paymentid);
    echo json_encode([
        "status" => "success",
        "result" => false,
        "reason" => $reason
    ]);
}
