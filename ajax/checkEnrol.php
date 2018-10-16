<?php

require_once(dirname(__FILE__).'/../../../config.php');
require_once("$CFG->libdir/moodlelib.php");

$courseid = $_POST['courseid'];

$context = context_course::instance($courseid, MUST_EXIST);

if (is_enrolled($context, NULL, '', true)) {
    echo json_encode([
        "status" => "success",
        "result" => true
    ]);

} else {
    echo json_encode([
        "status" => "success",
        "result" => false
    ]);
}
